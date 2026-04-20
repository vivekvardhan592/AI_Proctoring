import { motion } from 'framer-motion';
import { 
  TrendingUp, Users, Award, AlertTriangle, 
  BarChart3, PieChart 
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart as RechartsPie, 
  Cell, Pie 
} from 'recharts';

const integrityTrend = [
  { date: 'Mar 20', score: 91 },
  { date: 'Mar 21', score: 89 },
  { date: 'Mar 22', score: 94 },
  { date: 'Mar 23', score: 92 },
  { date: 'Mar 24', score: 96 },
  { date: 'Mar 25', score: 95 },
  { date: 'Mar 26', score: 97 },
];

const riskDistribution = [
  { name: 'Low Risk', value: 68, color: '#10b981' },
  { name: 'Medium Risk', value: 24, color: '#f59e0b' },
  { name: 'High Risk', value: 8, color: '#ef4444' },
];

const topStudents = [
  { rank: 1, name: "Aditya Verma", score: 98.7, exam: "ML", integrity: 99 },
  { rank: 2, name: "Meera Nair", score: 97.4, exam: "DSA", integrity: 97 },
  { rank: 3, name: "Karan Joshi", score: 96.1, exam: "OS", integrity: 94 },
];

const examStats = [
  { exam: "Advanced Algorithms", students: 142, avgIntegrity: 93.4, violations: 12 },
  { exam: "Data Structures", students: 98, avgIntegrity: 91.2, violations: 8 },
  { exam: "Machine Learning", students: 67, avgIntegrity: 88.9, violations: 19 },
  { exam: "Web Development", students: 134, avgIntegrity: 95.1, violations: 5 },
];

export default function Reports() {
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
          { label: "Overall Integrity", value: "94.8%", change: "+2.1%", icon: Award, color: "emerald" },
          { label: "Total Violations", value: "187", change: "-14%", icon: AlertTriangle, color: "red" },
          { label: "Students Monitored", value: "2,847", change: "+231", icon: Users, color: "indigo" },
          { label: "Avg Session Time", value: "47 min", change: "+3 min", icon: TrendingUp, color: "sky" },
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
              <p className={`text-sm mt-4 font-medium ${stat.change.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
                {stat.change} from last week
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
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={integrityTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis domain={[85, 100]} stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: 'none', 
                      borderRadius: '16px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    }} 
                  />
                  <Line 
                    type="natural" 
                    dataKey="score" 
                    stroke="#4f46e5" 
                    strokeWidth={5} 
                    dot={{ fill: '#4f46e5', r: 6 }}
                    activeDot={{ r: 9 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Risk Distribution Pie */}
        <div className="lg:col-span-4">
          <Card className="p-8 h-full">
            <h2 className="text-2xl font-semibold mb-8">Risk Distribution</h2>
            
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    dataKey="value"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              {riskDistribution.map((item, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-semibold" style={{ color: item.color }}>
                    {item.value}%
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{item.name}</p>
                </div>
              ))}
            </div>
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
                  {examStats.map((exam, index) => (
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
              {topStudents.map((student, index) => (
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
                    <Badge variant="emerald" className="px-6 py-2 text-sm">
                      Excellent
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