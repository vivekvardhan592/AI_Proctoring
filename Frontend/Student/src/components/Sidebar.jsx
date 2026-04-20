// src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Calendar, BarChart2, User, LogOut, Menu, X } from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL);
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      socket.emit('join', { id: user._id, name: user.name, role: 'student' });
    }
    return () => socket.disconnect();
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/UpcomingExams', label: 'Upcoming Exams', icon: Calendar },
    { path: '/MyResult', label: 'My Results', icon: BarChart2 },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = import.meta.env.VITE_LOGIN_URL;
  };

  return (
    <motion.div
      animate={{ width: isOpen ? 260 : 80 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      className="h-screen fixed z-50 flex flex-col bg-white border-r border-slate-200 shadow-sm font-sans"
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
                  Student Portal
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
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Exact match for Dashboard or includes the path
          const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);

          return (
            <button
              key={item.path}
              onClick={() => {
                 navigate(item.path);
                 setIsOpen(false); // Can close on mobile if desired, though here it's desktop
              }}
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
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
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