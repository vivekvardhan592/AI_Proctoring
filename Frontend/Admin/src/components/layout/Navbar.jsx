import { Bell, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = import.meta.env.VITE_LOGIN_URL;
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'A';
  };

  return (
    <div className="h-16 border-b bg-white px-8 flex items-center justify-between">
      <div className="text-slate-400 text-sm">
        {new Date().toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric'
        })} • {new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          meridiem: 'short' 
        })}
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 hover:bg-slate-100 rounded-xl">
          <Bell className="w-5 h-5 text-slate-600" />
          <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowLogoutMenu(!showLogoutMenu)}
            className="flex items-center gap-3 hover:bg-slate-50 px-3 py-2 rounded-lg transition"
          >
            <div className="text-right">
              <p className="font-semibold text-sm">{user?.name || 'Admin'}</p>
              <p className="text-xs text-slate-500 -mt-0.5">{user?.role || 'Admin'}</p>
            </div>
            <div className="w-9 h-9 bg-violet-600 rounded-2xl flex items-center justify-center text-white font-semibold text-sm">
              {getInitials(user?.name)}
            </div>
          </button>

          {showLogoutMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}