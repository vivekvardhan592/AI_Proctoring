import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import React, { useState, Suspense, lazy } from 'react';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './context/ProtectedRoute';

import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';

// Code Splitting - Load pages only when visited
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LiveMonitoring = lazy(() => import('./pages/LiveMonitoring'));
const CreateExam = lazy(() => import('./pages/CreateExam'));
const Violations = lazy(() => import('./pages/Violations'));
const ViolationGallery = lazy(() => import('./pages/ViolationGallery'));
const Reports = lazy(() => import('./pages/Reports'));
const Students = lazy(() => import('./pages/Students'));

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <p className="text-slate-600">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'ml-72' : 'ml-20'
        }`}
      >
        <Navbar />

        <main className="flex-1 overflow-auto p-8 lg:p-10 bg-slate-50">
          <AnimatePresence mode="wait">
            <Suspense fallback={<div className="flex justify-center items-center h-full pt-20"><div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>}>
              <Routes>
                <Route path="/admin/dashboard" element={<ProtectedRoute component={Dashboard} requiredRole="admin" />} />
                <Route path="/admin/live" element={<ProtectedRoute component={LiveMonitoring} requiredRole="admin" />} />
                <Route path="/admin/create-exam" element={<ProtectedRoute component={CreateExam} requiredRole="admin" />} />
                <Route path="/admin/violations" element={<ProtectedRoute component={Violations} requiredRole="admin" />} />
                <Route path="/admin/violation-gallery" element={<ProtectedRoute component={ViolationGallery} requiredRole="admin" />} />
                <Route path="/admin/students" element={<ProtectedRoute component={Students} requiredRole="admin" />} />
                <Route path="/admin/reports" element={<ProtectedRoute component={Reports} requiredRole="admin" />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Routes>
            </Suspense>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default App;