import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Clock, AlertTriangle, TrendingUp, 
  Eye, Shield, Award, Activity 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { token } = useAuth();
  const [data, setData] = useState({
    sessions: [],
    exams: []
  });
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, eRes, oRes] = await Promise.all([
          fetch(import.meta.env.VITE_API_URL + "/api/sessions", { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(import.meta.env.VITE_API_URL + "/api/exams", { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(import.meta.env.VITE_API_URL + "/api/stats/online", { headers: { "Authorization": `Bearer ${token}` } })
        ]);
        const sData = await sRes.json();
        const eData = await eRes.json();
        const oData = await oRes.json();
        if (sData.success && eData.success) {
          setData({ sessions: sData.data, exams: eData.data });
        }
        if (oData.success) {
          setOnlineCount(oData.count);
        }
      } catch (err) { }
      finally { setLoading(false); }
    };

    if (token) {
      fetchData();
      socketRef.current = io(import.meta.env.VITE_API_URL);
      
      socketRef.current.on('online-students-count', (count) => {
        setOnlineCount(count);
      });

      socketRef.current.on('session-live-update', (session) => {
        setData(prev => {
          const exists = prev.sessions.find(s => s._id === session._id);
          const updatedSessions = exists 
            ? prev.sessions.map(s => s._id === session._id ? session : s)
            : [session, ...prev.sessions];
          return { ...prev, sessions: updatedSessions };
        });
      });

      socketRef.current.on('violation-alert', (session) => {
        setData(prev => ({
          ...prev,
          sessions: prev.sessions.map(s => s._id === session._id ? session : s)
        }));
      });

      return () => {
        if (socketRef.current) socketRef.current.disconnect();
      };
    }
  }, [token]);

  // Calculations
  const activeStudents = new Set(data.sessions.map(s => s.studentId?._id)).size;
  const liveExams = data.exams.filter(e => e.isActive).length;
  const totalViolations = data.sessions.reduce((acc, s) => acc + (s.violationsCount || 0), 0);
  const avgIntegrity = data.sessions.length > 0 
    ? (100 - (totalViolations / data.sessions.length * 5)).toFixed(1) 
    : "100";
  
  const recentViolations = data.sessions
    .filter(s => s.violationsCount > 0)
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    .slice(0, 3);

  const stats = [
    { title: "Online Now", value: onlineCount, change: "Live", icon: Users, color: "indigo", trend: "up" },
    { title: "Active Exams", value: data.sessions.filter(s => s.status === 'ongoing').length, change: "Current", icon: Clock, color: "sky", trend: "up" },
    { title: "Total Violations", value: totalViolations, change: totalViolations > 10 ? "Alert" : "Stable", icon: AlertTriangle, color: "red", trend: totalViolations > 10 ? "up" : "down" },
    { title: "Avg Integrity", value: `${avgIntegrity}%`, change: "Excellent", icon: Award, color: "emerald", trend: "up" },
  ];

  if (loading) return <div className="p-12 text-center text-slate-500 font-bold animate-pulse text-2xl">Initializing Monitoring System...</div>;

  return (
    <div className="min-h-full pb-12">
      <div className="flex items-end justify-between mb-12">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-semibold tracking-tight text-slate-900"
          >
            Dashboard
          </motion.h1>
          <p className="text-slate-500 mt-3 text-lg">
            Real-time proctoring metrics and integrity overview.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-4"
        >
          <div className="bg-white px-5 py-3 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="font-medium text-slate-700 font-mono text-sm tracking-widest">SYSTEM MONITOR ACTIVE</span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className={`bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group ${stat.color === 'red' && totalViolations > 5 ? 'border-red-200 bg-red-50/20' : ''}`}>
              <div className="flex justify-between items-start">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                  stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                  stat.color === 'sky' ? 'bg-sky-50 text-sky-600' :
                  stat.color === 'red' ? 'bg-red-50 text-red-600' :
                  'bg-emerald-50 text-emerald-600'
                }`}>
                  <stat.icon className="w-7 h-7" />
                </div>
                <div className={`px-4 py-1.5 rounded-2xl text-[10px] uppercase font-bold tracking-widest flex items-center gap-1
                  ${stat.trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {stat.change}
                </div>
              </div>

              <div className="mt-10">
                <p className="text-5xl font-semibold text-slate-900 tracking-tighter">{stat.value}</p>
                <p className="text-slate-500 mt-2 text-sm font-bold uppercase tracking-widest opacity-60">{stat.title}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Integrity Trend</h2>
                <p className="text-slate-500">Live AI monitoring performance</p>
              </div>
              <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold tracking-widest">
                <Activity className="w-4 h-4" />
                {avgIntegrity}% AVG
              </div>
            </div>

            <div className="h-96 flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
               <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Analytics Visualization Engine Loading...</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <Shield className="w-10 h-10 text-indigo-300" />
                <div>
                  <p className="text-indigo-300 text-[10px] font-bold tracking-widest">AI RISK ASSESSMENT</p>
                  <p className="text-3xl font-bold">{totalViolations > 5 ? 'Elevated' : 'Safe'}</p>
                </div>
              </div>
              <div className="text-7xl font-bold tracking-tighter mb-2">{avgIntegrity}</div>
              <p className="text-indigo-200 font-medium">System Compliance Score</p>
              
              <div className="mt-10 pt-6 border-t border-white/10 text-sm space-y-4">
                <div className="flex justify-between">
                  <span className="text-indigo-300 font-medium">Active Monitoring</span>
                  <span className="font-bold">{data.sessions.filter(s => s.status === 'ongoing').length} Users</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-300 font-medium">Auto-Terminated</span>
                  <span className="font-bold text-red-300">{data.sessions.filter(s => s.status === 'terminated').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-12">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Recent Violations</h2>
              <button 
                onClick={() => window.location.href = '/admin/violations'}
                className="text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-widest text-xs flex items-center gap-2 group"
              >
                Full Access Log <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>

            <div className="space-y-4">
              {recentViolations.map((session, index) => (
                <motion.div
                  key={session._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-2xl p-6 transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
                       {session.studentId?.name?.[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{session.studentId?.name}</p>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{session.examId?.title}</p>
                    </div>
                  </div>

                  <div className="flex-1 px-12">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                      <p className="text-slate-600 font-bold text-xs uppercase tracking-widest">{session.violationsCount} Violation Events</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase">Detected At</p>
                      <p className="font-bold text-slate-700 text-sm">{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>

                    <div className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest
                      ${session.status === 'terminated' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {session.status}
                    </div>

                    <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {recentViolations.length === 0 && (
                <div className="text-center py-10 bg-emerald-50 text-emerald-700 rounded-3xl font-bold uppercase tracking-widest text-xs">
                  Optimal System Integrity • No Recent Violations
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}