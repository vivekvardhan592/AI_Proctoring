// src/components/Sidebar.jsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Calendar, BarChart2, User, LogOut, Menu, X } from 'lucide-react';

const navItems = [
  { path: '/',              label: 'Dashboard',    icon: Home },
  { path: '/UpcomingExams', label: 'Upcoming Exams', icon: Calendar },
  { path: '/MyResult',      label: 'My Results',   icon: BarChart2 },
  { path: '/profile',       label: 'Profile',      icon: User },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const navigate  = useNavigate();

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL);
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      socket.emit('join', { id: user._id, name: user.name, role: 'student' });
    }
    return () => socket.disconnect();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = import.meta.env.VITE_LOGIN_URL;
  };

  return (
    <motion.div
      animate={{ width: isOpen ? 300 : 100 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      className="sticky top-0 h-screen flex-shrink-0 flex flex-col bg-white border-r border-slate-200 shadow-sm font-sans overflow-hidden z-50"
    >
      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="px-5 py-6 border-b border-slate-100 relative flex-shrink-0 min-h-[76px] flex items-center">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <h1 className="text-base font-bold text-indigo-900 tracking-tight leading-tight">ProctorAI</h1>
              <p className="text-sm font-semibold text-slate-400 mt-0.5">Student Portal</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`absolute transition-all duration-300 w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-indigo-600
            ${isOpen ? 'right-4 top-1/2 -translate-y-1/2' : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'}`}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── NAV ────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative w-full flex items-center ${isOpen ? 'justify-start px-4 gap-4' : 'justify-center'} py-3.5 rounded-xl text-sm font-semibold transition-all duration-150
                ${isActive
                  ? 'bg-indigo-50/70 text-indigo-700'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                }`}
            >
              {/* Left accent bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-indigo-600 rounded-r-full" />
              )}

              {/* Icon */}
              <Icon
                size={24}
                className={`flex-shrink-0 transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                }`}
              />

              {/* Label */}
              <AnimatePresence>
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap text-[15px]"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>

      {/* ── LOGOUT ─────────────────────────────────────────── */}
      <div className="px-3 py-4 border-t border-slate-100 flex-shrink-0">
        <button
          onClick={handleLogout}
          className={`flex items-center ${isOpen ? 'justify-start px-4 gap-4' : 'justify-center'} w-full py-3.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-red-50 hover:text-red-500 transition`}
        >
          <LogOut size={24} />
          <AnimatePresence>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap text-[15px]"
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