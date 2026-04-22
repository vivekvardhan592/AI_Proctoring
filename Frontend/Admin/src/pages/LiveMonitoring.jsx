import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, Users, AlertTriangle, Eye, XCircle, Search
} from 'lucide-react';
import Card from '../components/ui/Card';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export default function LiveMonitoring() {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const socketRef = useRef(null);
  const peerRefs = useRef({});       // sessionId -> RTCPeerConnection
  const streamsRef = useRef({});     // sessionId -> MediaStream  (cache for race-condition fix)
  const videoRefs = useRef({});      // sessionId -> <video> element

  // ─────────────────────────────────────────────────────────────────
  //  Callback ref: called by React when a video element mounts/unmounts
  //  If we already have the stream cached, attach immediately
  // ─────────────────────────────────────────────────────────────────
  const registerVideoRef = useCallback((sessionId, el) => {
    videoRefs.current[sessionId] = el;
    if (el && streamsRef.current[sessionId]) {
      el.srcObject = streamsRef.current[sessionId];
    }
  }, []);

  const fetchLiveSessions = async () => {
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + "/api/sessions", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSessions(data.data.filter(s => s.status === 'ongoing'));
      }
    } catch (err) { }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchLiveSessions();

    socketRef.current = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"]
    });

    // Tell students we're watching (triggers re-offer from any active students)
    socketRef.current.emit('request-webrtc-offer');

    // ── Live session updates (add / update / remove) ──────────────────
    socketRef.current.on('session-live-update', (updatedSession) => {
      setSessions(prev => {
        if (updatedSession.status !== 'ongoing') {
          // Cleanup peer + cached stream when student finishes
          if (peerRefs.current[updatedSession._id]) {
            peerRefs.current[updatedSession._id].close();
            delete peerRefs.current[updatedSession._id];
          }
          delete streamsRef.current[updatedSession._id];
          delete videoRefs.current[updatedSession._id];
          return prev.filter(s => s._id !== updatedSession._id);
        }
        const exists = prev.find(s => s._id === updatedSession._id);
        if (exists) {
          return prev.map(s => s._id === updatedSession._id ? updatedSession : s);
        }
        return [...prev, updatedSession];
      });
    });

    // ── WebRTC Offer from student ─────────────────────────────────────
    socketRef.current.on('webrtc-offer', async ({ offer, from, sessionId }) => {
      if (!sessionId || !offer) return;

      // Close old connection if renegotiating
      if (peerRefs.current[sessionId]) {
        peerRefs.current[sessionId].close();
        delete peerRefs.current[sessionId];
      }

      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      peerRefs.current[sessionId] = peer;

      // ── FIX: cache stream + use stored callback ref ─────────────────
      peer.ontrack = (event) => {
        const stream = event.streams[0];
        if (!stream) return;

        // Cache the stream
        streamsRef.current[sessionId] = stream;

        // Attach directly if the video element is already mounted
        const videoEl = videoRefs.current[sessionId];
        if (videoEl) {
          videoEl.srcObject = stream;
        }
        // If DOM element isn't mounted yet, registerVideoRef() will attach
        // it as soon as React renders and calls the callback ref
      };

      peer.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('webrtc-ice-candidate', {
            candidate: event.candidate,
            to: from,        // ← send ICE back to the specific student socket
            sessionId
          });
        }
      };

      peer.onconnectionstatechange = () => {
        console.log(`[LiveMonitor] PeerConnection state [${sessionId}]: ${peer.connectionState}`);
      };

      try {
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socketRef.current.emit('webrtc-answer', {
          answer,
          to: from,          // ← send answer back to the specific student socket
          sessionId
        });
      } catch (err) {
        console.error('[LiveMonitor] WebRTC negotiation error:', err);
      }
    });

    // ── ICE candidates FROM student ───────────────────────────────────
    socketRef.current.on('webrtc-ice-candidate', async ({ candidate, sessionId }) => {
      const peer = peerRefs.current[sessionId];
      if (!peer || !candidate) return;

      try {
        // Buffer: only add when remote description is set
        if (peer.remoteDescription) {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {
        console.warn('[LiveMonitor] ICE add failed:', e.message);
      }
    });

    // ── Cleanup ───────────────────────────────────────────────────────
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      Object.values(peerRefs.current).forEach(peer => peer.close());
      peerRefs.current = {};
      streamsRef.current = {};
      videoRefs.current = {};
    };
  }, []);

  // ── Terminate (Admin force-end) ───────────────────────────────────
  const handleTerminate = async (sessionId) => {
    if (!window.confirm("Terminate this student's exam session?")) return;

    setSessions(prev => prev.filter(s => s._id !== sessionId));
    if (peerRefs.current[sessionId]) {
      peerRefs.current[sessionId].close();
      delete peerRefs.current[sessionId];
    }
    delete streamsRef.current[sessionId];

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/terminate/${sessionId}`, {
        method: 'PUT',
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (err) {
      alert("Error terminating exam.");
      fetchLiveSessions();
    }
  };

  const filteredSessions = sessions.filter(s => {
    const sName = s.studentId?.name || "";
    const eTitle = s.examId?.title || "";
    return sName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           eTitle.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-full pb-12">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Live Monitoring</h1>
          <p className="text-slate-500 mt-2 text-lg">Real-time webcam feeds of all active exam sessions.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white px-6 py-3 rounded-3xl shadow-sm border flex items-center gap-3">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="font-bold text-slate-700 tracking-widest text-xs uppercase">
              {sessions.length} Student{sessions.length !== 1 ? 's' : ''} Live
            </span>
          </div>
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────────────── */}
      <div className="relative mb-8 max-w-2xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Filter by student name or exam..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 pl-14 pr-6 py-4 rounded-3xl focus:outline-none focus:border-indigo-500 text-lg placeholder:text-slate-400 font-medium"
        />
      </div>

      {/* ── Grid ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 text-center font-bold text-slate-400 uppercase tracking-[0.2em] animate-pulse text-2xl">
          Connecting to Live Stream...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence>
            {filteredSessions.map((session, index) => (
              <motion.div
                key={session._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden border-none shadow-2xl shadow-indigo-100/50 hover:shadow-indigo-200 transition-all group rounded-[2.5rem] bg-white">
                  
                  {/* ── Video Feed ──────────────────────────────────── */}
                  <div className="relative h-64 bg-slate-950 flex items-center justify-center overflow-hidden">
                    
                    {/* 
                      FIX: Use callback ref instead of document.getElementById.
                      registerVideoRef caches the DOM node AND attaches any
                      already-received stream, solving the race condition.
                    */}
                    <video
                      ref={(el) => registerVideoRef(session._id, el)}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Dark overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                    {/* LIVE badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      <span className="text-white text-[10px] font-bold tracking-[0.2em] uppercase">LIVE</span>
                    </div>

                    {/* Placeholder shown BEFORE stream arrives */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <Video className="w-10 h-10 text-slate-600 mb-2 opacity-40" />
                      <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest opacity-40">
                        Awaiting stream...
                      </p>
                    </div>

                    {/* Violation badge */}
                    {session.violationsCount > 0 && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {session.violationsCount}
                      </div>
                    )}

                    {/* Student name bottom overlay */}
                    <div className="absolute bottom-0 inset-x-0 p-4">
                      <p className="text-white font-black text-sm truncate">{session.studentId?.name}</p>
                      <p className="text-white/60 text-[10px] font-bold truncate">{session.examId?.title}</p>
                    </div>
                  </div>

                  {/* ── Info + Actions ──────────────────────────────── */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Violations</p>
                        <p className={`text-xl font-black tracking-tighter ${session.violationsCount > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                          {session.violationsCount || 0}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Last Flag</p>
                        <p className={`text-[10px] font-black leading-tight ${session.violationsCount > 0 ? 'text-red-500' : 'text-emerald-500 uppercase'}`}>
                          {session.lastViolationType || "None"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {/* Fullscreen button */}
                      <button
                        onClick={() => {
                          const videoEl = videoRefs.current[session._id];
                          if (videoEl) {
                            if (videoEl.requestFullscreen) videoEl.requestFullscreen();
                            else if (videoEl.webkitRequestFullscreen) videoEl.webkitRequestFullscreen();
                          }
                        }}
                        className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 text-xs uppercase tracking-widest"
                      >
                        <Eye className="w-4 h-4" />
                        Full View
                      </button>

                      {/* Terminate button */}
                      <button
                        onClick={() => handleTerminate(session._id)}
                        className="px-4 py-3.5 border-2 border-red-100 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 rounded-2xl transition-all"
                        title="Terminate session"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────── */}
      {!loading && filteredSessions.length === 0 && (
        <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 max-w-4xl mx-auto mt-12">
          <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-12 h-12" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">No Active Sessions</h3>
          <p className="text-slate-500 mt-2 font-medium">There are no students currently taking exams.</p>
        </div>
      )}
    </div>
  );
}