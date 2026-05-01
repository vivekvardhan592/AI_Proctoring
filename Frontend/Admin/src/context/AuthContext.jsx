import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize from localStorage or URL on mount, then validate with server
  useEffect(() => {
    const bootstrap = async () => {
      // Check URL for auth params from cross-origin login
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      const urlUser = urlParams.get('user');

      if (urlToken && urlUser) {
        try {
          localStorage.setItem('token', urlToken);
          localStorage.setItem('user', urlUser);
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error('Error saving URL auth data:', err);
        }
      }

      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!storedToken || !storedUser) {
        setLoading(false);
        return;
      }

      let parsedUser;
      try {
        parsedUser = JSON.parse(storedUser);
      } catch {
        logout();
        setLoading(false);
        return;
      }

      // 🔒 Role gate: admin portal must only accept admin users
      if (parsedUser?.role !== 'admin') {
        console.warn('Non-admin user attempted to access Admin portal');
        logout();
        setLoading(false);
        return;
      }

      // 🔒 Validate token with server (catches expired/revoked tokens)
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/auth/me`,
          { headers: { Authorization: `Bearer ${storedToken}` } }
        );

        if (res.status === 401) {
          // Token invalid or expired
          logout();
          setLoading(false);
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            // Re-check role on fresh server data
            if (data.data.role !== 'admin') {
              logout();
              setLoading(false);
              return;
            }
            // Update localStorage with fresh user data
            localStorage.setItem('user', JSON.stringify(data.data));
            setToken(storedToken);
            setUser(data.data);
          }
        }
      } catch (err) {
        // Network error — allow cached data so admin isn't locked out offline
        console.warn('Could not validate token with server:', err.message);
        setToken(storedToken);
        setUser(parsedUser);
      }

      setLoading(false);
    };

    bootstrap();
  }, []);

  const login = (userData, authToken) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
    setError(null);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const isAuthenticated = !!token && !!user;
  const userRole = user?.role;

  const value = {
    user,
    token,
    loading,
    error,
    setError,
    login,
    logout,
    isAuthenticated,
    userRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
