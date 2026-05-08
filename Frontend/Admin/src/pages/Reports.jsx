import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Users, Award, AlertTriangle, 
  BarChart3, PieChart 
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart as RechartsPie, 
  Cell, Pie, AreaChart, Area
} from 'recharts';
import { useAuth } from '../context/AuthContext';

export default function Reports() {
  const { token } = useAuth();
  
  const [data, setData] = useState({ sessions: [], exams: [] });
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const [sRes, eRes, tRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/sessions`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${import.meta.env.VITE_API_URL}/api/exams`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${import.meta.env.VITE_API_URL}/api/sessions/integrity-trend`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const [sData, eData, tData] = await Promise.all([sRes.json(), eRes.json(), tRes.json()]);

        if (sData.success && eData.success) {
          setData({ sessions: sData.data, exams: eData.data });
        }
        if (tData.success) {
          setTrendData(tData.data);
        }
      } catch (error) {
        console.error("Failed to fetch reports data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Compute analytics
  const analytics = useMemo(() => {
    const sessions = data.sessions;
    const exams = data.exams;

    if (sessions.length === 0) return null;

    let totalViolations = 0;
    const uniqueStudents = new Set();
    let totalDurationMs = 0;
    let completedSessionsCount = 0;

    const riskCounts = { low: 0, medium: 0, high: 0 };
    const examMap = {};
    const studentsArr = [];

    sessions.forEach(s => {
      const vCount = s.violationsCount || 0;
      totalViolations += vCount;
      if (s.studentId?._id) uniqueStudents.add(s.studentId._id);

      // Duration for completed sessions
      if (s.endTime && s.startTime) {
        totalDurationMs += (new Date(s.endTime) - new Date(s.startTime));
        completedSessionsCount++;
      }

      // Risk Distribution
      if (vCount > 15) riskCounts.high++;
      else if (vCount > 5) riskCounts.medium++;
      else riskCounts.low++;

      // Exam Stats
      if (s.examId?._id) {
        const eId = s.examId._id;
        if (!examMap[eId]) {
          examMap[eId] = {
            exam: s.examId.title,
            students: new Set(),
            violations: 0,
            sessionCount: 0
          };
        }
        if (s.studentId?._id) examMap[eId].students.add(s.studentId._id);
        examMap[eId].violations += vCount;
        examMap[eId].sessionCount++;
      }

      // Top students candidate
      if (s.studentId && s.examId) {
        const integrity = Math.max(0, 100 - (vCount * 5));
        studentsArr.push({
          name: s.studentId.name,
          exam: s.examId.title,
          integrity: integrity,
          score: s.score || 0
        });
      }
    });

    const avgIntegrity = Math.max(0, 100 - (totalViolations / sessions.length * 5)).toFixed(1);
    const avgDurationMin = completedSessionsCount > 0 ? Math.round((totalDurationMs / completedSessionsCount) / 60000) : 0;

    const riskDistribution = [
      { name: 'Low Risk', value: riskCounts.low, color: '#10b981' },
      { name: 'Medium Risk', value: riskCounts.medium, color: '#f59e0b' },
      { name: 'High Risk', value: riskCounts.high, color: '#ef4444' },
    ];

    const examStats = Object.values(examMap).map(e => ({
      exam: e.exam,
      students: e.students.size,
      violations: e.violations,
      avgIntegrity: Math.max(0, 100 - (e.violations / e.sessionCount * 5)).toFixed(1)
    }));

    const topStudents = studentsArr
      .sort((a, b) => b.integrity - a.integrity)
      .slice(0, 3)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    return {
      avgIntegrity,
      totalViolations,
      uniqueStudentsCount: uniqueStudents.size,
      avgDurationMin,
      riskDistribution,
      examStats,
      topStudents
    };
  }, [data]);

  // Fallback client-side trend if backend isn't ready or empty
  const computedTrend = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      const daySessions = data.sessions.filter(s => s.startTime && new Date(s.startTime).toISOString().split('T')[0] === dayStr);
      const total = daySessions.length;
      const viol = daySessions.reduce((a, s) => a + (s.violationsCount || 0), 0);
      const integrity = total > 0 ? parseFloat(Math.max(0, Math.min(100, 100 - (viol / total * 5))).toFixed(1)) : null;

      days.push({ date: label, score: integrity });
    }
    return days;
  }, [data.sessions]);

  const chartData = trendData.length > 0 ? trendData.map(d => ({ date: d.date, score: d.integrity })) : computedTrend;
  const hasChartData = chartData.some(d => d.score !== null);

  if (loading) {
    return <div className="max-w-7xl mx-auto pb-12 animate-pulse"><div className="h-10 bg-slate-200 rounded w-1/4 mb-12"></div><div className="grid grid-cols-4 gap-6"><div className="h-40 bg-slate-200 rounded-2xl"></div><div className="h-40 bg-slate-200 rounded-2xl"></div><div className="h-40 bg-slate-200 rounded-2xl"></div><div className="h-40 bg-slate-200 rounded-2xl"></div></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Analytics & Reports</h1>
          <p className="text-slate-500 mt-2 text-lg">Exam integrity insights and performance metrics</p>
        </div>
        <div className="text-sm text-slate-500">Last updated: Just now</div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: "Overall Integrity", value: analytics ? `${analytics.avgIntegrity}%` : "—", change: "Current", icon: Award, color: "emerald" },
          { label: "Total Violations", value: analytics ? analytics.totalViolations : "0", change: "Overall", icon: AlertTriangle, color: "red" },
          { label: "Students Monitored", value: analytics ? analytics.uniqueStudentsCount : "0", change: "Active", icon: Users, color: "indigo" },
          { label: "Avg Session Time", value: analytics ? `${analytics.avgDurationMin} min` : "—", change: "Avg", icon: TrendingUp, color: "sky" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="p-8">
              <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-100 flex items-center justify-center mb-6`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
              <p className="text-5xl font-semibold tracking-tighter text-slate-900">{stat.value}</p>
              <p className="text-slate-500 mt-2">{stat.label}</p>
              <p className={`text-sm mt-4 font-medium ${stat.color === 'red' ? 'text-red-600' : 'text-emerald-600'}`}>
                {stat.change} metric
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Integrity Trend Line Chart */}
        <div className="lg:col-span-8">
          <Card className="p-8 h-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-semibold">Weekly Integrity Trend</h2>
                <p className="text-slate-500">AI-powered proctoring performance</p>
              </div>
              <Badge variant="emerald">↑ Improving</Badge>
            </div>
            
            <div className="h-96">
              {!hasChartData ? (
                 <div className="h-full flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                   <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No trend data available</p>
                 </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: 'none', 
                        borderRadius: '16px',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#4f46e5" 
                      strokeWidth={4} 
                      fill="url(#colorScore)"
                      dot={{ fill: '#4f46e5', r: 4, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8, strokeWidth: 0 }}
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* Risk Distribution Pie */}
        <div className="lg:col-span-4">
          <Card className="p-8 h-full">
            <h2 className="text-2xl font-semibold mb-8">Risk Distribution</h2>
            
            {!analytics ? (
              <div className="h-80 flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No data available</p>
              </div>
            ) : (
              <>
                <div className="h-80 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={analytics.riskDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        dataKey="value"
                      >
                        {analytics.riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  {analytics.riskDistribution.map((item, i) => (
                    <div key={i} className="text-center">
                      <div className="text-3xl font-semibold" style={{ color: item.color }}>
                        {item.value}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{item.name}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Exam-wise Performance */}
        <div className="lg:col-span-12">
          <Card className="p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-semibold">Exam Performance Overview</h2>
              <BarChart3 className="w-6 h-6 text-slate-400" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-5 px-6 font-medium text-slate-500">Exam Name</th>
                    <th className="text-left py-5 px-6 font-medium text-slate-500">Students</th>
                    <th className="text-left py-5 px-6 font-medium text-slate-500">Avg. Integrity</th>
                    <th className="text-left py-5 px-6 font-medium text-slate-500">Violations</th>
                    <th className="text-left py-5 px-6 font-medium text-slate-500">Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {!analytics || analytics.examStats.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500">No exam data available</td>
                    </tr>
                  ) : analytics.examStats.map((exam, index) => (
                    <motion.tr 
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.08 }}
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="py-6 px-6 font-medium">{exam.exam}</td>
                      <td className="py-6 px-6 text-slate-600">{exam.students}</td>
                      <td className="py-6 px-6">
                        <span className="font-semibold text-emerald-600">{exam.avgIntegrity}%</span>
                      </td>
                      <td className="py-6 px-6">
                        <span className="font-medium text-red-600">{exam.violations}</span>
                      </td>
                      <td className="py-6 px-6">
                        <Badge variant={exam.violations > 15 ? "red" : exam.violations > 8 ? "amber" : "emerald"}>
                          {exam.violations > 15 ? "High" : exam.violations > 8 ? "Medium" : "Low"}
                        </Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Top Performers */}
        <div className="lg:col-span-12">
          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-8">Top Integrity Scorers</h2>
            
            <div className="space-y-4">
              {!analytics || analytics.topStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-500">No student data available</div>
              ) : analytics.topStudents.map((student, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-50 hover:bg-white p-6 rounded-3xl border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl flex items-center justify-center font-bold text-xl">
                      {student.rank}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{student.name}</p>
                      <p className="text-sm text-slate-500">{student.exam}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-12">
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Integrity Score</p>
                      <p className="text-3xl font-semibold text-emerald-600">{student.integrity}%</p>
                    </div>
                    <Badge variant={student.integrity >= 90 ? "emerald" : student.integrity >= 70 ? "amber" : "red"} className="px-6 py-2 text-sm">
                      {student.integrity >= 90 ? "Excellent" : student.integrity >= 70 ? "Good" : "Poor"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}