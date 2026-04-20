// src/pages/StudentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, Award, PlayCircle, History, BookOpen, AlertCircle, ShieldCheck } from 'lucide-react';

export default function StudentDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState({
    upcomingExams: [],
    attemptedExams: [],
    ongoingExam: null
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const [user, setUser] = useState(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [eRes, sRes, uRes] = await Promise.all([
          fetch(import.meta.env.VITE_API_URL + "/api/exams", { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(import.meta.env.VITE_API_URL + "/api/sessions", { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(import.meta.env.VITE_API_URL + "/api/auth/me", { headers: { "Authorization": `Bearer ${token}` } })
        ]);

        const eData = await eRes.json();
        const sData = await sRes.json();
        const uData = await uRes.json();

        if (uData.success) {
           setUser(uData.data);
           localStorage.setItem('user', JSON.stringify(uData.data));
        }

        if (eData.success && sData.success && uData.success) {
          const allExams = eData.data;
          const allSessions = sData.data;

          // 1. Identify ALL Attempted or Ongoing Exam IDs (Robust string comparison)
          const attemptedOrOngoingExamIds = new Set(
            allSessions.map(s => s.examId?._id ? s.examId._id.toString() : s.examId?.toString())
          );

          // 2. Filter Logic (Strict state separation)
          const ongoing = allSessions.filter(s => s.status === 'ongoing');
          const completed = allSessions.filter(s => s.status === 'completed' || s.status === 'terminated');
          const upcoming = allExams.filter(e => e.isActive && !attemptedOrOngoingExamIds.has(e._id.toString()));
          
          setData({
            upcomingExams: upcoming,
            attemptedExams: completed,
            ongoingExams: ongoing
          });
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchDashboardData();
  }, [token]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-sans">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">Synchronizing Telemetry...</p>
    </div>
  );

  if (user && user.verificationStatus !== 'verified') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 max-w-lg border border-slate-100"
        >
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-indigo-100">
             <ShieldCheck size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Identity Lock</h2>
          {user.verificationStatus === 'pending' ? (
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">Your facial biometric data has been submitted and is currently <strong className="text-amber-500">Pending Admin Verification</strong>. You will be granted access immediately upon approval.</p>
          ) : user.verificationStatus === 'rejected' ? (
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">Your submitted face image was <strong className="text-red-500">Rejected</strong> by the administrator. Please capture a clear, recognizable image.</p>
          ) : (
             <p className="text-slate-500 font-medium mb-8 leading-relaxed">You must register your biometric facial data to unlock dashboard access and participate in secured exams.</p>
          )}
          <button onClick={() => navigate('/Profile')} className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl w-full uppercase tracking-widest text-xs hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all">Go to Profile →</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className={`flex-1 min-w-0 transition-all duration-300 ml-20 lg:ml-64`}>
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
          
          {/* Ongoing Section */}
          {data.ongoingExams?.length > 0 && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="pb-8 lg:pb-10"
            >
              <div className="bg-indigo-600 text-white rounded-3xl p-10 shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-700"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter mb-2 flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                      EXAM IN PROGRESS
                    </h2>
                    <p className="text-indigo-100 text-xl font-medium">{data.ongoingExams[0]?.examId?.title}</p>
                  </div>
                  <button 
                    onClick={() => navigate(`/exam/${data.ongoingExams[0]?.examId?._id}`)}
                    className="px-8 py-4 bg-white text-indigo-700 font-black rounded-2xl shadow-xl hover:scale-105 transition-transform uppercase tracking-widest text-xs flex items-center gap-2"
                  >
                    Resume Now <PlayCircle size={18} />
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          <motion.section 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="pb-10 z-10 relative"
          >
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter mb-3">
              Dashboard
            </h1>
            <p className="text-slate-500 text-lg font-medium max-w-2xl">
              Track your performance, resume active sessions, and access upcoming exams.
            </p>
          </motion.section>

          {/* Performance Stats */}
          <section className="pb-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white"><Activity size={24} /></div>
              </div>
              <p className="text-5xl font-black text-slate-900 tracking-tighter">{data.ongoingExams?.length || 0}</p>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Active Modules</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-slate-50 rounded-xl text-slate-600 transition-colors group-hover:bg-slate-900 group-hover:text-white"><Clock size={24} /></div>
              </div>
              <p className="text-5xl font-black text-slate-900 tracking-tighter">{data.upcomingExams.length}</p>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Pending Access</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white border border-emerald-100 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-emerald-50 opacity-50 transform group-hover:scale-150 transition-transform duration-500"><Award size={120} /></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white"><Award size={24} /></div>
                </div>
                <p className="text-5xl font-black text-emerald-600 tracking-tighter">{data.attemptedExams.filter(s => s.status === 'completed').length}</p>
                <p className="text-emerald-500 font-bold uppercase tracking-widest text-[10px] mt-2">Total Completed</p>
              </div>
            </motion.div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
             {/* 1. Ongoing Exams */}
             <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase flex items-center gap-2"><PlayCircle size={18} className="text-indigo-500"/> Live Modules</h2>
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                </div>
                <div className="space-y-4">
                  {data.ongoingExams?.map(session => (
                    <div key={session._id} className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl relative overflow-hidden group">
                       <h3 className="text-lg font-bold text-indigo-900 mb-4">{session.examId?.title}</h3>
                       <button 
                         onClick={() => navigate(`/exam/${session.examId?._id}`)}
                         className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs shadow-md shadow-indigo-200 flex justify-center items-center gap-2"
                       >
                         Resume Session <PlayCircle size={16} />
                       </button>
                    </div>
                  ))}
                  {(!data.ongoingExams || data.ongoingExams.length === 0) && (
                    <div className="border border-dashed border-slate-200 bg-white p-8 rounded-[2rem] text-center shadow-sm">
                       <div className="mx-auto w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-3"><AlertCircle size={24} /></div>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">No active modules</p>
                    </div>
                  )}
                </div>
             </motion.section>

             {/* 2. Upcoming Exams */}
             <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase flex items-center gap-2"><BookOpen size={18} className="text-slate-500"/> Available Next</h2>
                  <Link to="/UpcomingExams" className="text-indigo-600 font-bold text-[10px] hover:text-indigo-800 tracking-widest transition-colors">VIEW ALL →</Link>
                </div>
                <div className="space-y-4">
                  {data.upcomingExams.slice(0, 3).map(exam => (
                    <div key={exam._id} className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow group">
                       <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{exam.subject}</p>
                       <h3 className="text-lg font-bold text-slate-900 mb-5 tracking-tight leading-tight">{exam.title}</h3>
                       <button 
                         onClick={() => navigate(`/exam/${exam._id}`)}
                         className="w-full py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-600 hover:text-white transition-colors uppercase tracking-widest text-[10px]"
                       >
                         Start Exam
                       </button>
                    </div>
                  ))}
                  {data.upcomingExams.length === 0 && (
                     <div className="border border-dashed border-slate-200 bg-white p-8 rounded-[2rem] text-center shadow-sm">
                       <div className="mx-auto w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-3"><BookOpen size={24} /></div>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Clear for now</p>
                     </div>
                  )}
                </div>
             </motion.section>

             {/* 3. Attempted History */}
             <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase mb-6 flex items-center gap-2"><History size={18} className="text-slate-500"/> History & Insights</h2>
                <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                   <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      <table className="w-full">
                         <tbody className="divide-y divide-slate-100 font-bold text-sm">
                            {data.attemptedExams.map(session => (
                               <tr key={session._id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-5">
                                     <p className="text-slate-900 mb-1 line-clamp-1">{session.examId?.title}</p>
                                     <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${session.status === 'terminated' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                        {session.status}
                                     </span>
                                  </td>
                                  <td className="p-5 text-right whitespace-nowrap">
                                     <p className="text-lg font-black text-slate-900">{session.status === 'completed' ? session.score : '—'}</p>
                                     <p className="text-[9px] text-slate-400 uppercase font-semibold">{formatDate(session.startTime)}</p>
                                  </td>
                               </tr>
                            ))}
                            {data.attemptedExams.length === 0 && (
                              <tr><td className="p-8 text-center text-slate-400 font-semibold text-xs tracking-widest">NO HISTORY YET</td></tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </div>
             </motion.section>
          </div>
        </main>
        <footer className="border-t border-slate-200 py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-white mt-auto">
          © {new Date().getFullYear()} ProctorAI — Secure Examination Framework
        </footer>
      </div>
    </div>
  );
}