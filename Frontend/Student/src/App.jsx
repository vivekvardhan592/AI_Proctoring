// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import StudentDashboard from './pages/StudentDashboard';
import UpcomingExams from './pages/UpcomingExams';
import MyResults from './pages/MyResult';
import ReviewResult from './pages/ReviewResult';
import Profile from './pages/Profile';
import ExamPage from './pages/ExamPage';

// Protected Route Component
const ProtectedRoute = ({ children, requireVerification = false }) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

  if (!token || !user) {
    // Redirect to login if not authenticated
    window.location.href = import.meta.env.VITE_LOGIN_URL;
    return null;
  }

  if (user.role === 'admin') {
    // Redirect to admin dashboard if admin
    window.location.href = import.meta.env.VITE_ADMIN_URL;
    return null;
  }

  if (requireVerification && user.verificationStatus !== 'verified') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App(){
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check URL for auth params from cross-origin login
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const urlUser = urlParams.get('user');

    if (urlToken && urlUser) {
      localStorage.setItem('token', urlToken);
      localStorage.setItem('user', urlUser);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    console.log("Auth Check:", { hasToken: !!token, hasUser: !!user, role: user?.role });

    if (token && user && (user.role === 'student' || user.role === 'admin')) {
      if (user.role === 'admin') {
         console.warn("Admin detected in Student portal, redirecting...");
         window.location.href = import.meta.env.VITE_ADMIN_URL;
      } else {
         setIsAuthenticated(true);
      }
    } else {
      console.error("Auth Failure: Redirecting to login");
      window.location.href = import.meta.env.VITE_LOGIN_URL;
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 font-sans">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Authenticating Session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect automatically
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <Routes>
        <Route path="/" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path="/upcomingexams" element={<ProtectedRoute requireVerification={true}><UpcomingExams /></ProtectedRoute>} />
        <Route path="/MyResult" element={<ProtectedRoute requireVerification={true}><MyResults/></ProtectedRoute>} />
        <Route path="/review/:sessionId" element={<ProtectedRoute requireVerification={true}><ReviewResult /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/exam/:examId" element={<ProtectedRoute requireVerification={true}><ExamPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;