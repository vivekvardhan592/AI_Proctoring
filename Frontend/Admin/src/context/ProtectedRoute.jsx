import React from 'react';
import { useAuth } from './AuthContext';

/**
 * ProtectedRoute Component
 * Protects routes based on authentication and optional role-based access
 * 
 * @param {React.Component} Component - Component to render if authorized
 * @param {string|array} requiredRole - Required role(s) to access the route (optional)
 * @param {React.Component} Fallback - Component to render if not authorized (optional)
 */
const ProtectedRoute = ({ 
  component: Component, 
  requiredRole = null, 
  fallback: Fallback = null,
  ...rest 
}) => {
  const { isAuthenticated, userRole, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    if (Fallback) {
      return <Fallback />;
    }
    // Redirect to login
    window.location.href = import.meta.env.VITE_LOGIN_URL;
    return null;
  }

  // Check if user has required role
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(userRole)) {
      if (Fallback) {
        return <Fallback />;
      }
      return <div>You don't have access to this resource</div>;
    }
  }

  return <Component {...rest} />;
};

export default ProtectedRoute;
