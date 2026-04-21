import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, Users, AlertTriangle, Eye, Pause, Play, 
  Filter, Search, MoreVertical, XCircle 
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

  const currentStudentRef = useRef(null);
  const peerRefs = useRef({}); // Store multiple peers mapped by sessionId

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

  socketRef.current = io(import.meta.env.VITE_API_URL);

  socketRef.current.emit('join', { role: 'admin' });

  // 📡 Ping all active students to send their video feeds just in case they started before you logged in!
  socketRef.current.emit('request-webrtc-offer');

  socketRef.current.on('session-live-update', (updatedSession) => {
     setSessions(prev => {
        if (updatedSession.status !== 'ongoing') {
            return prev.filter(s => s._id !== updatedSession._id);
        }
        const exists = prev.find(s => s._id === updatedSession._id);
        if (exists) {
            return prev.map(s => s._id === updatedSession._id ? updatedSession : s);
        }
        return [...prev, updatedSession];
     });
  });

  // ✅ LISTENER MUST BE HERE (same useEffect)
  socketRef.current.on('webrtc-offer', async ({ offer, from, sessionId }) => {
    if (!sessionId) return;
    
    // Clean up old peer if it exists
    if (peerRefs.current[sessionId]) {
      peerRefs.current[sessionId].close();
    }
    
    const peer = new RTCPeerConnection();
    peerRefs.current[sessionId] = peer;

    peer.ontrack = (event) => {
      const video = document.getElementById(`admin-video-${sessionId}`);
      if (video) {
        video.srcObject = event.streams[0];
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('webrtc-ice-candidate', {
          candidate: event.candidate,
          to: from, // ⭐ SEND BACK TO STUDENT
          sessionId
        });
      }
    };

    await peer.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socketRef.current.emit('webrtc-answer', {
      answer,
      to: from, // ⭐ IMPORTANT
      sessionId
    });
  });
  
  socketRef.current.on('webrtc-ice-candidate', async ({ candidate, sessionId }) => {
    const peer = peerRefs.current[sessionId];
    if (peer && peer.remoteDescription && candidate) {
        try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) { }
    }
  });

}, []);

  const handleTerminate = async (sessionId) => {
    if (!window.confirm("Are you sure you want to terminate this student's exam?")) return;
    
    setSessions(prev => prev.filter(s => s._id !== sessionId));
    if (peerRefs.current[sessionId]) {
       peerRefs.current[sessionId].close();
       delete peerRefs.current[sessionId];
    }

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
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Live Monitoring</h1>
          <p className="text-slate-500 mt-2 text-lg">Real-time status of all active exam sessions.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white px-6 py-3 rounded-3xl shadow-sm border flex items-center gap-3">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="font-bold text-slate-700 tracking-widest text-xs uppercase">{sessions.length} Students Online</span>
          </div>
        </div>
      </div>

      <div className="relative mb-8 max-w-2xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Filter active students or exams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 pl-14 pr-6 py-4 rounded-3xl focus:outline-none focus:border-indigo-500 text-lg placeholder:text-slate-400 font-medium"
        />
      </div>

      {loading ? (
        <div className="py-20 text-center font-bold text-slate-400 uppercase tracking-[0.2em] animate-pulse text-2xl">Connecting to Data Stream...</div>
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
                  <div className="relative h-64 bg-slate-900 flex items-center justify-center overflow-hidden">
                    <video 
                      id={`admin-video-${session._id}`}
                      autoPlay
                      playsInline 
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="text-white text-6xl font-black opacity-10 select-none group-hover:scale-150 transition-transform duration-1000">LIVE</div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    
                    <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-white text-[10px] font-bold tracking-[0.2em] uppercase">MONITORING</span>
                    </div>

                    <div className="absolute bottom-6 left-6 text-white">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Last Sync</p>
                       <p className="text-xs font-mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    </div>
                  </div>

                  <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                       <div>
                          <h3 className="font-bold text-2xl text-slate-900 tracking-tight">{session.studentId?.name}</h3>
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{session.examId?.title}</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                       <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
                          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-2">Violations</p>
                          <p className={`text-2xl font-black tracking-tighter ${session.violationsCount > 0 ? 'text-red-500' : 'text-slate-900'}`}>{session.violationsCount}</p>
                       </div>
                       <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
                          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-2">Last Violation</p>
                          <p className={`text-[10px] font-black tracking-tight leading-tight ${session.violationsCount > 0 ? 'text-red-500' : 'text-emerald-500 uppercase'}`}>
                             {session.lastViolationType || "None Detected"}
                          </p>
                       </div>
                    </div>

                    <div className="flex gap-4">
                       <button className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-indigo-200">
                          <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          Watch
                       </button>
                       <button 
                         onClick={() => handleTerminate(session._id)}
                         className="px-4 py-4 border-2 border-slate-100 text-red-500 hover:bg-red-50 hover:border-red-100 rounded-2xl transition-all"
                       >
                          <XCircle className="w-6 h-6" />
                       </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

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