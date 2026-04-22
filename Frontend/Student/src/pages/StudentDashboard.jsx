// src/pages/StudentDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Clock, Award, PlayCircle, BookOpen,
  AlertCircle, ShieldCheck, ChevronRight, CheckCircle2,
  XCircle, Zap, ArrowRight, ClipboardList
} from 'lucide-react';

// ── Skeleton ────────────────────────────────────────────────────────────────
const Pulse = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />
);

// ── Cache ───────────────────────────────────────────────────────────────────
const CACHE_KEY = 'student_dashboard_v2';
const CACHE_TTL = 30_000;
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    return Date.now() - ts < CACHE_TTL ? data : null;
  } catch { return null; }
}
function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

// ── Greeting ────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    completed:  { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500',  label: 'Completed' },
    terminated: { bg: 'bg-red-50',      text: 'text-red-600',     dot: 'bg-red-500',      label: 'Terminated' },
    ongoing:    { bg: 'bg-indigo-50',   text: 'text-indigo-700',  dot: 'bg-indigo-500',   label: 'Ongoing' },
  };
  const s = map[status] || map.completed;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate   = useNavigate();
  const socketRef  = useRef(null);
  const token      = localStorage.getItem('token');

  const [user] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  const cached = readCache();
  const [data, setData] = useState(cached || { upcomingExams: [], attemptedExams: [], ongoingExams: [] });
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (!token || !user) return;

    (async () => {
      try {
        const [eRes, sRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/exams`,    { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${import.meta.env.VITE_API_URL}/api/sessions`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [eData, sData] = await Promise.all([eRes.json(), sRes.json()]);

        if (eData.success && sData.success) {
          const sessions = sData.data;
          const usedIds  = new Set(sessions.map(s => (s.examId?._id || s.examId)?.toString()));
          const fresh    = {
            ongoingExams:  sessions.filter(s => s.status === 'ongoing'),
            attemptedExams: sessions.filter(s => s.status === 'completed' || s.status === 'terminated'),
            upcomingExams: eData.data.filter(e => e.isActive && !usedIds.has(e._id.toString())),
          };
          setData(fresh);
          writeCache(fresh);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();

    socketRef.current = io(import.meta.env.VITE_API_URL);
    socketRef.current.emit('student-join', { userId: user._id, name: user.name });
    return () => socketRef.current?.disconnect();
  }, [token]);

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  // ── Identity gate ─────────────────────────────────────────────────────────
  if (user && user.verificationStatus !== 'verified') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-slate-100 p-12 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Identity Required</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            {user.verificationStatus === 'pending'
              ? 'Your face scan is pending admin approval. You\'ll get access the moment it\'s verified.'
              : user.verificationStatus === 'rejected'
              ? 'Your submission was rejected. Please re-capture a clear, well-lit photo.'
              : 'Register your face to unlock access to secured exam sessions.'}
          </p>
          <button
            onClick={() => navigate('/Profile')}
            className="w-full py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            Complete Verification <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  const totalCompleted = data.attemptedExams.filter(s => s.status === 'completed').length;
  const totalScore     = data.attemptedExams
    .filter(s => s.status === 'completed' && s.score)
    .reduce((a, s) => a + s.score, 0);

  return (
    <div className="h-screen bg-[#f8f9fc] flex font-sans overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 backdrop-blur-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Live exam pill */}
              {data.ongoingExams?.length > 0 && (
                <button
                  onClick={() => navigate(`/exam/${data.ongoingExams[0]?.examId?._id}`)}
                  className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-full text-xs font-bold hover:bg-red-100 transition-colors"
                >
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  Exam in Progress — Resume
                </button>
              )}
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.[0]?.toUpperCase() ?? 'S'}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-10 py-12 max-w-[1500px] w-full mx-auto">

          {/* ── Hero greeting ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <p className="text-sm font-semibold text-indigo-500 mb-2 uppercase tracking-widest">
              {getGreeting()}
            </p>
            <h1 className="text-5xl font-bold text-slate-900 tracking-tight">
              {user?.name?.split(' ')[0] ?? 'Student'} <span className="text-slate-300">👋</span>
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Here's your exam activity at a glance.
            </p>
          </motion.div>

          {/* ── Stats row ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                label: 'Active Sessions', icon: Activity,
                value: loading && !cached ? null : data.ongoingExams.length,
                color: 'indigo', accent: 'bg-indigo-600',
              },
              {
                label: 'Available Exams', icon: BookOpen,
                value: loading && !cached ? null : data.upcomingExams.length,
                color: 'sky', accent: 'bg-sky-500',
              },
              {
                label: 'Completed', icon: CheckCircle2,
                value: loading && !cached ? null : totalCompleted,
                color: 'emerald', accent: 'bg-emerald-500',
              },
              {
                label: 'Total Score', icon: Award,
                value: loading && !cached ? null : totalScore || '—',
                color: 'violet', accent: 'bg-violet-500',
              },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="group bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-default"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    s.color === 'indigo'  ? 'bg-indigo-50  group-hover:bg-indigo-600'  :
                    s.color === 'sky'     ? 'bg-sky-50     group-hover:bg-sky-500'     :
                    s.color === 'emerald' ? 'bg-emerald-50 group-hover:bg-emerald-500' :
                                           'bg-violet-50  group-hover:bg-violet-500'
                  }`}>
                    <s.icon className={`w-7 h-7 transition-colors ${
                      s.color === 'indigo'  ? 'text-indigo-600  group-hover:text-white' :
                      s.color === 'sky'     ? 'text-sky-600     group-hover:text-white' :
                      s.color === 'emerald' ? 'text-emerald-600 group-hover:text-white' :
                                             'text-violet-600  group-hover:text-white'
                    }`} />
                  </div>
                  <div className={`w-1.5 h-10 rounded-full opacity-20 ${
                    s.color === 'indigo'  ? 'bg-indigo-600'  :
                    s.color === 'sky'     ? 'bg-sky-500'     :
                    s.color === 'emerald' ? 'bg-emerald-500' :
                                           'bg-violet-500'
                  }`} />
                </div>
                {s.value === null
                  ? <Pulse className="w-16 h-10 mb-2" />
                  : <p className="text-4xl font-bold text-slate-900 tracking-tight">{s.value}</p>
                }
                <p className="text-sm text-slate-400 font-medium mt-2">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* ── Main two-column layout ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

            {/* LEFT — Available exams (3/5 width) */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="xl:col-span-3 space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">Available Exams</h2>
                </div>
                <Link
                  to="/UpcomingExams"
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                >
                  View all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Exam cards */}
              <div className="space-y-3">
                {loading && !cached
                  ? Array(3).fill(0).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200/60 p-6 space-y-4 shadow-sm">
                      <Pulse className="w-24 h-4" />
                      <Pulse className="w-56 h-6" />
                      <div className="flex gap-3">
                        <Pulse className="w-28 h-5" />
                        <Pulse className="w-28 h-5" />
                      </div>
                    </div>
                  ))
                  : data.upcomingExams.length > 0
                    ? data.upcomingExams.slice(0, 5).map((exam, i) => (
                      <motion.div
                        key={exam._id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.05 }}
                        className="group bg-white rounded-3xl border border-slate-200/60 p-7 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer"
                        onClick={() => navigate(`/exam/${exam._id}`)}
                      >
                        <div className="flex items-start justify-between gap-5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2.5">
                              <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full">
                                {exam.subject || 'General'}
                              </span>
                              {exam.duration && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> {exam.duration} min
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-slate-900 text-base leading-snug mb-1.5 truncate">
                              {exam.title}
                            </h3>
                            {exam.totalMarks && (
                              <p className="text-sm text-slate-400">
                                {exam.totalMarks} marks · Pass: {exam.passingMarks}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/exam/${exam._id}`); }}
                            className="flex-shrink-0 flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 group-hover:shadow-indigo-300"
                          >
                            Start <PlayCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                    : (
                      <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-16 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
                          <BookOpen className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-base font-semibold text-slate-700 mb-1.5">No exams available</p>
                        <p className="text-sm text-slate-400">New exams will appear here when published.</p>
                      </div>
                    )
                }
              </div>

              {/* Ongoing exams (if any) */}
              {data.ongoingExams?.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    </div>
                    <h2 className="text-base font-semibold text-slate-800">In Progress</h2>
                  </div>
                  {data.ongoingExams.map(session => (
                    <div
                      key={session._id}
                      onClick={() => navigate(`/exam/${session.examId?._id}`)}
                      className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-lg shadow-indigo-200"
                    >
                      <div>
                        <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">Exam in session</p>
                        <p className="font-semibold text-base">{session.examId?.title}</p>
                      </div>
                      <button className="bg-white text-indigo-700 text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-sm">
                        Resume <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* RIGHT — History & Insights (2/5 width) */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="xl:col-span-2 space-y-5"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-slate-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
              </div>

              {/* History list */}
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-md overflow-hidden">
                {loading && !cached
                  ? Array(4).fill(0).map((_, i) => (
                    <div key={i} className={`px-7 py-6 flex items-center justify-between ${i < 3 ? 'border-b border-slate-100' : ''}`}>
                      <div className="space-y-2.5">
                        <Pulse className="w-36 h-4" />
                        <Pulse className="w-20 h-3" />
                      </div>
                      <div className="text-right space-y-2.5">
                        <Pulse className="w-12 h-6 ml-auto" />
                        <Pulse className="w-20 h-3 ml-auto" />
                      </div>
                    </div>
                  ))
                  : data.attemptedExams.length > 0
                    ? data.attemptedExams.slice(0, 8).map((session, i) => (
                      <motion.div
                        key={session._id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 0.25 + i * 0.04 }}
                        className={`px-7 py-6 flex items-center justify-between hover:bg-slate-50/80 transition-colors ${i < data.attemptedExams.slice(0, 8).length - 1 ? 'border-b border-slate-100' : ''}`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            session.status === 'completed'
                              ? 'bg-emerald-50' : 'bg-red-50'
                          }`}>
                            {session.status === 'completed'
                              ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              : <XCircle className="w-5 h-5 text-red-400" />
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate max-w-[160px]">
                              {session.examId?.title ?? 'Exam'}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{formatDate(session.startTime)}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {session.status === 'completed'
                            ? <p className="text-lg font-bold text-slate-900">{session.score ?? 0}</p>
                            : <StatusBadge status="terminated" />
                          }
                        </div>
                      </motion.div>
                    ))
                    : (
                      <div className="px-7 py-20 text-center">
                        <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                        <p className="text-base font-semibold text-slate-600">No exam history yet</p>
                        <p className="text-sm text-slate-400 mt-1.5">Completed exams will show here.</p>
                      </div>
                    )
                }
              </div>


            </motion.div>

          </div>
        </main>

        <footer className="px-8 py-5 border-t border-slate-200/60 bg-white">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} ProctorAI · Secure Examination Platform
          </p>
        </footer>
      </div>
    </div>
  );
}