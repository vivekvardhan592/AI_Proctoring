import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  Home, Video, PlusCircle, AlertTriangle, BarChart3, LogOut,
  Menu, X, Camera, UserX
} from 'lucide-react';

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { path: '/admin/live', label: 'Live Monitoring', icon: Video, badge: 'LIVE' },
  { path: '/admin/create-exam', label: 'Create Exam', icon: PlusCircle },
  { path: '/admin/violations', label: 'Violations', icon: AlertTriangle },
  { path: '/admin/violation-gallery', label: 'Violation Images', icon: Camera },
  { path: '/admin/students', label: 'Students', icon: UserX },
  { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = import.meta.env.VITE_LOGIN_URL;
  };

  return (
    <motion.div
      animate={{ width: isOpen ? 260 : 80 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      className="h-screen fixed z-50 flex flex-col
      bg-white
      border-r border-slate-200 shadow-sm"
    >

      {/* 🔷 HEADER */}
      <div className="px-4 py-5 border-b border-slate-100 relative">

        <div className="flex items-center gap-1">
        

          {/* Title */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, x: -2 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
              >
                <h1 className="text-sm font-bold text-indigo-900 tracking-tight">
                  ProctorAI
                </h1>
                <p className="text-xs font-semibold text-slate-400">
                  Monitoring
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 🔘 TOGGLE BUTTON */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`absolute top-5 transition-all duration-300 w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-indigo-600 ${isOpen ? 'right-3 translate-x-0' : 'left-1/2 -translate-x-1/2'}`}
        >
          {isOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* 🚀 NAVIGATION */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center ${isOpen ? 'justify-start px-3 gap-3' : 'justify-center'} py-2.5 rounded-lg text-sm font-semibold transition

              ${isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >

              {/* Icon */}
              <div className={`p-2 rounded-md transition
                ${isActive ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400'}
              `}>
                <Icon size={18} />
              </div>

              {/* Label */}
              <AnimatePresence>
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* LIVE BADGE */}
              {item.badge && isOpen && (
                <span className="ml-auto text-[10px] font-black tracking-widest px-2 py-0.5 rounded 
                bg-red-50 text-red-600 border border-red-100">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 🚪 LOGOUT */}
      <div className="p-3 border-t border-slate-100">
        <button 
          onClick={handleLogout}
          className={`flex items-center ${isOpen ? 'justify-start px-3 gap-3' : 'justify-center'} w-full py-2.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition`}
        >
          <LogOut size={18} />

          <AnimatePresence>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );
}