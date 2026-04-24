import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, Search, Filter, Eye, Clock, User, 
  Calendar, Download 
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';

export default function Violations() {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch(import.meta.env.VITE_API_URL + "/api/sessions", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          const violatingSessions = data.data.filter(s => s.violationsCount > 0 || s.status === 'terminated');
          setSessions(violatingSessions);
        }
      } catch (err) {
        setError(err.message || "Failed to fetch violations.");
      }
      finally { setLoading(false); }
    };

    if (token) {
      fetchSessions();
      socketRef.current = io(import.meta.env.VITE_API_URL);
      
      const updateOrAdd = (session) => {
        if (session.violationsCount > 0 || session.status === 'terminated') {
          setSessions(prev => {
            const exists = prev.find(s => s._id === session._id);
            if (exists) {
              return prev.map(s => s._id === session._id ? session : s);
            } else {
              return [session, ...prev];
            }
          });
        }
      };

      socketRef.current.on('session-live-update', updateOrAdd);
      socketRef.current.on('violation-alert', updateOrAdd);

      return () => {
        if (socketRef.current) socketRef.current.disconnect();
      };
    }
  }, [token]);

  const filteredSessions = sessions.filter(session => {
    const sName = session.studentId?.name || "";
    const eTitle = session.examId?.title || "";
    return sName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           eTitle.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Violations Log</h1>
          <p className="text-slate-500 mt-2 text-lg">AI-detected suspicious activities and terminated sessions.</p>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => window.print()}>
            <Download className="w-5 h-5" />
            Print Report
          </Button>
        </div>
      </div>

      <Card className="p-6 mb-8">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by student or exam..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-4 bg-white border border-slate-200 rounded-3xl focus:outline-none focus:border-indigo-500 text-lg placeholder:text-slate-400"
          />
        </div>
      </Card>

      <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
        {loading ? (
          <div className="text-center py-20">
             <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto"></div>
             <p className="mt-4 text-slate-500 font-medium">Crunching data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-red-50 text-red-600 font-semibold p-8">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left py-6 px-8 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Student</th>
                  <th className="text-left py-6 px-8 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Exam</th>
                  <th className="text-left py-6 px-8 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Violations</th>
                  <th className="text-left py-6 px-8 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Type</th>
                  <th className="text-left py-6 px-8 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Time</th>
                  <th className="text-left py-6 px-8 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Status</th>
                  <th className="text-left py-6 px-8 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map((session, index) => (
                  <motion.tr
                    key={session._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-6 px-8">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
                            {session.studentId?.name?.[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{session.studentId?.name}</p>
                            <p className="text-xs text-slate-500 font-medium">{session.studentId?.email}</p>
                          </div>
                       </div>
                    </td>
                    <td className="py-6 px-8 font-semibold text-slate-700">{session.examId?.title}</td>
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${session.violationsCount > 1 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                          {session.violationsCount}
                        </span>
                        <span className="text-sm font-medium text-slate-500">Events</span>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <span className="text-xs font-bold text-slate-500 italic">
                        {session.lastViolationType || "N/A"}
                      </span>
                    </td>
                    <td className="py-6 px-8 text-slate-500 font-medium text-xs">{formatDate(session.startTime)}</td>
                    <td className="py-6 px-8">
                       <Badge variant={session.status === 'terminated' ? 'red' : 'amber'}>
                         {session.status.toUpperCase()}
                       </Badge>
                    </td>
                    <td className="py-6 px-8">
                       <Button 
                         variant="secondary" 
                         className="px-4 py-2 text-xs"
                         onClick={() => { setSelectedSession(session); setIsModalOpen(true); }}
                       >
                         View Timeline
                       </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detailed Timeline Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Violation History Log"
          size="lg"
        >
          {selectedSession && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedSession.studentId?.name}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{selectedSession.examId?.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Violations</p>
                  <p className="text-3xl font-black text-red-600 tracking-tighter">{selectedSession.violationsCount}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Integrity Timeline</h4>
                <div className="space-y-3">
                  {selectedSession.violationLogs && selectedSession.violationLogs.length > 0 ? (
                    selectedSession.violationLogs.map((log, i) => (
                      <div key={i} className="p-5 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-colors shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="font-bold text-slate-800">{log.type}</span>
                          </div>
                          <span className="text-xs font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        {log.evidence && (
                          <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-100 border-b border-slate-200">Visual Evidence (Snapshot)</p>
                            <img src={log.evidence} alt="Violation Evidence" className="w-full h-auto" />
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 font-medium italic">No detailed logs found for this session.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>

        {!loading && filteredSessions.length === 0 && (
          <div className="text-center py-24">
             <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Badge variant="emerald" className="scale-150 p-2">Clean</Badge>
             </div>
             <h3 className="text-2xl font-bold text-slate-900">No Violations Found</h3>
             <p className="text-slate-500 mt-2">All students are adhering to the rules.</p>
          </div>
        )}
      </Card>
    </div>
  );
}