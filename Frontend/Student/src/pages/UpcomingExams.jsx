// src/pages/UpcomingExams.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, BookOpen, Clock3, PlayCircle, AlertCircle, Search, FileText } from 'lucide-react';

export default function UpcomingExams() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await fetch(import.meta.env.VITE_API_URL + "/api/exams", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setExams(data.data);
        } else {
          setError(data.message || "Failed to load exams");
        }
      } catch (err) {
        setError("Network error. Is the backend server running?");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchExams();
    }
  }, [token]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <button
          className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-lg shadow-md"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation menu"
        >
          <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex-1 min-w-0 transition-all duration-300 ml-20 lg:ml-64">
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
                <Calendar size={36} className="text-indigo-600" />
                Upcoming Modules
              </h1>
              <p className="text-slate-500 text-lg font-medium max-w-2xl">
                Prepare for your scheduled assessments. Review guidelines and initialize proctored exams here.
              </p>
            </motion.section>

            <section>
              {loading ? (
                <div className="flex flex-col items-center py-20 text-indigo-600">
                  <AlertCircle size={40} className="animate-spin mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Synchronizing Schedule...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-100 text-red-600 p-8 rounded-[2rem] text-center max-w-2xl mx-auto">
                  <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-xl font-black tracking-tight mb-2">Sync Failed</p>
                  <p className="text-red-500 font-medium mb-6">{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-8 py-4 bg-red-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition"
                  >
                    Retry Connection
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {exams.map((exam, index) => (
                    <motion.div
                      key={exam._id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                      className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col group relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between mb-8 relative z-10">
                        <div>
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                             <BookOpen size={12} /> {exam.subject}
                          </p>
                          <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                            {exam.title}
                          </h3>
                        </div>
                        <span className={`inline-flex px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${exam.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {exam.isActive ? 'Active' : 'Locked'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-8 flex-grow relative z-10">
                        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                           <Clock3 size={18} className="text-indigo-400 mb-2" />
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Window</p>
                           <p className="font-bold text-slate-800">{formatDate(exam.startTime)}</p>
                           <p className="font-semibold text-slate-600 text-sm">{formatTime(exam.startTime)} - {formatTime(exam.endTime)}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                           <FileText size={18} className="text-emerald-400 mb-2" />
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Parameters</p>
                           <p className="font-bold text-slate-800">{exam.duration} Minutes</p>
                           <p className="font-semibold text-slate-600 text-sm">{exam.totalMarks} Total Marks</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 relative z-10 mt-auto">
                        <button 
                          onClick={() => navigate(`/exam/${exam._id}`)}
                          className="flex-1 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 uppercase tracking-widest text-xs"
                        >
                          <PlayCircle size={18} /> Initialize
                        </button>
                        <button className="flex-1 px-8 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl transition-all uppercase tracking-widest text-xs">
                          Review Rules
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {!loading && !error && exams.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-dashed border-slate-200 bg-white p-16 rounded-[3rem] text-center max-w-3xl mx-auto shadow-sm">
                   <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                     <Calendar size={40} />
                   </div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">No Modules Scheduled</h3>
                   <p className="text-slate-500 font-medium">Your calendar is currently clear. Check back later or contact your administrator.</p>
                </motion.div>
              )}
            </section>
          </main>

          <footer className="border-t border-slate-200 py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-white mt-auto">
            © {new Date().getFullYear()} ProctorAI — Secure Examination Framework
          </footer>
        </div>
      </div>
  );
}