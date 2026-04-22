// src/pages/MyResults.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, AlertCircle, FileText, CheckCircle, XCircle, Search, Clock, Award } from 'lucide-react';

export default function MyResults() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch(import.meta.env.VITE_API_URL + "/api/sessions", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setSessions(data.data);
        } else {
          setError(data.message || "Failed to load results.");
        }
      } catch (err) {
        setError("Network error. Is the backend server running?");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchResults();
  }, [token]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const completedSessions = sessions.filter(
  (s) => s.status === "completed" || s.endTime
);
  const passedCount = sessions.filter(
  s => (s.status === "completed" || s.endTime) &&
       s.score >= (s.examId?.passingMarks || 0)
).length;

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex font-sans overflow-hidden">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <div className="flex-1 min-w-0 overflow-y-auto">

          <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
            <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
              <div className="text-xl font-bold text-indigo-600 lg:hidden">ProctorAI</div>
              <div className="flex items-center gap-5 ml-auto">
                <span className="text-slate-600 text-sm hidden sm:block font-bold">
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </header>

          <main className="max-w-[1400px] mx-auto px-6 py-10 lg:py-12">
            <motion.section 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="pb-10"
            >
              <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter mb-3 flex items-center gap-4">
                <BarChart3 size={36} className="text-indigo-600" />
                Performance Metrics
              </h1>
              <p className="text-slate-500 text-lg font-medium max-w-2xl">
                Analyze your academic performance, review scores, and track proctoring flags.
              </p>
            </motion.section>

            {loading ? (
              <div className="flex flex-col items-center py-20 text-indigo-600">
                <AlertCircle size={40} className="animate-spin mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Retrieving Reports...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-100 text-red-600 p-8 rounded-[2rem] text-center max-w-2xl mx-auto">
                 <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                 <p className="text-xl font-black tracking-tight mb-2">Retrieval Failed</p>
                 <p className="font-medium text-red-500">{error}</p>
              </div>
            ) : (
              <>
                <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="pb-12">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                        <FileText size={24} />
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Modules</div>
                      <div className="text-4xl font-black text-slate-900">{sessions.length}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle size={24} />
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cleared Modules</div>
                      <div className="text-4xl font-black text-emerald-600">{passedCount}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle size={24} />
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pending / Terminated</div>
                      <div className="text-4xl font-black text-amber-600">
                        {sessions.length - completedSessions.length}
                      </div>
                    </div>
                  </div>
                </motion.section>

                <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <div className="flex items-center justify-between mb-6">
                     <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                       <Award size={24} className="text-indigo-500" /> Assessment Log
                     </h2>
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="Search modules..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-medium" />
                     </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm mb-12">
                    {completedSessions.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Module ID</th>
                              <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Date Timestamp</th>
                              <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Raw Score</th>
                              <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Net Metric</th>
                              <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Certification</th>
                            </tr>
                          </thead>
                          <tbody>
                            {completedSessions.map((session) => {
                              const totalMarks = session.examId?.totalMarks || 0;
                              const percentage = totalMarks > 0 ? Math.round((session.score / totalMarks) * 100) : 0;
                              const isPassed = session.score >= (session.examId?.passingMarks || 0);

                              return (
                                <tr key={`result-${session._id}`} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                                  <td className="py-4 px-6 font-bold text-slate-700">{session.examId?.title || "Unknown Exam"}</td>
                                  <td className="py-4 px-6 text-slate-500 font-medium">{formatDate(session.startTime)}</td>
                                  <td className="py-4 px-6 font-black text-slate-900">{session.score} <span className="text-slate-400 font-medium">/ {totalMarks || "—"}</span></td>
                                  <td className="py-4 px-6 font-bold text-indigo-600">{percentage}%</td>
                                  <td className="py-4 px-6">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                      isPassed
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : 'bg-rose-50 text-rose-600'
                                    }`}>
                                      {isPassed ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                      {isPassed ? "Cleared" : "Failed"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-500 font-medium max-w-sm mx-auto">No assessment data available. Complete modules to generate analytical reports here.</p>
                      </div>
                    )}
                  </div>

                  <h2 className="text-2xl font-black text-slate-900 mb-6 tracking-tight flex items-center gap-2">
                    <Clock size={24} className="text-indigo-500" /> Detailed Event Trace
                  </h2>

                  <div className="space-y-6">
                    {sessions.map((session, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
                        key={session._id}
                        className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col md:flex-row gap-8 items-center"
                      >
                        <div className="flex-1 w-full">
                          <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                            {session.examId?.title || "Unknown Exam"}
                          </h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <Clock size={12} /> Executed: {formatDate(session.startTime)}
                          </p>
                        </div>

                        <div className="flex-1 w-full grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <div>
                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Duration</div>
                            <div className="font-bold text-slate-700">{session.examId?.duration || "—"} mins</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Final Score</div>
                            <div className="font-black text-indigo-600 text-lg">
                              {session.status === 'completed' ? `${session.score}/${session.examId?.totalMarks}` : "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Flagged Events</div>
                            <div className={`font-black ${session.violationsCount > 0 ? 'text-rose-500' : 'text-slate-700'}`}>
                              {session.violationsCount || 0} Flags
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">System Status</div>
                            <span className={`inline-flex px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest bg-white border shadow-sm ${
                                  session.status === 'completed' ? 'text-indigo-600 border-indigo-100' :
                                  session.status === 'ongoing' ? 'text-blue-600 border-blue-100' :
                                  'text-red-600 border-red-100'
                                }`}>
                              {session.status}
                            </span>
                          </div>
                        </div>

                        <div className="w-full md:w-auto flex flex-col gap-3 shrink-0">
                          <button 
                            onClick={() => navigate(`/review/${session._id}`)}
                            className="w-full md:w-48 px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-md uppercase tracking-widest text-xs flex justify-center items-center gap-2"
                          >
                            <Search size={14} /> Analyze Log
                          </button>
                        </div>
                      </motion.div>
                    ))}

                    {sessions.length === 0 && (
                      <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-[3rem] bg-white">
                        <Clock size={40} className="mx-auto mb-4 text-slate-300" />
                        <p className="text-xl font-black text-slate-900 tracking-tight">No Events Recorded</p>
                        <p className="text-slate-500 font-medium">Telemetry is empty for this user profile.</p>
                      </div>
                    )}
                  </div>
                </motion.section>
              </>
            )}
          </main>

          <footer className="border-t border-slate-200 py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-white mt-auto">
            © {new Date().getFullYear()} ProctorAI — Secure Examination Framework
          </footer>
        </div>
      </div>
  );
}