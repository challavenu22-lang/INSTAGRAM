import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Settings, 
  History, 
  LogOut, 
  MoreVertical 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useClickOutside } from '../hooks/useClickOutside';
import { Modal } from './Modal';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useClickOutside(dropdownRef, () => setIsOpen(false));

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleLogoutClick = () => {
    setIsOpen(false);
    setLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    setLogoutModalOpen(false);
    await logout();
    navigate('/login');
  };

  const isHomeActive = location.pathname === '/home' || location.pathname === '/';
  const isSettingsActive = location.pathname === '/settings';
  const isHistoryActive = location.pathname === '/history';

  return (
    <header className="sticky top-0 z-40 w-full glass-panel">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Top-Left: Home Navigation Link (Theme-Aware Solid Icon + Text) */}
        <Link 
          to="/home" 
          aria-label="Home"
          className="flex items-center gap-2.5 px-1 py-1 theme-text-primary hover:opacity-85 transition-opacity duration-200 focus:outline-none"
        >
          <svg 
            className="w-6 h-6 sm:w-7 sm:h-7 fill-current shrink-0" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12.707 2.293a1 1 0 00-1.414 0l-9 9A1 1 0 003 13h1v7a2 2 0 002 2h4a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h4a2 2 0 002-2v-7h1a1 1 0 00.707-1.707l-9-9z" />
          </svg>
          <span className="text-lg sm:text-xl font-bold tracking-tight theme-text-primary whitespace-nowrap">Home</span>
        </Link>

        {/* Top Right Header Actions */}
        <div className="flex items-center gap-3">
          {!user && (
            <Link to="/login" className="btn-secondary text-sm px-4 py-2">
              Sign In
            </Link>
          )}

          {/* Three-Dot Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsOpen(!isOpen);
                }
              }}
              aria-label="Menu"
              aria-haspopup="true"
              aria-expanded={isOpen}
              className="btn-secondary p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Menu Container */}
            {isOpen && (
              <div 
                className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-150 z-50"
                role="menu"
                aria-orientation="vertical"
              >
                <div className="py-1">
                  <Link
                    to="/home"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                      isHomeActive ? 'text-brand-500 bg-brand-500/10 border-l-2 border-brand-500 font-semibold' : 'theme-text-primary hover:opacity-75'
                    }`}
                    role="menuitem"
                  >
                    <Home className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">Home</span>
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                      isSettingsActive ? 'text-brand-500 bg-brand-500/10 border-l-2 border-brand-500 font-semibold' : 'theme-text-primary hover:opacity-75'
                    }`}
                    role="menuitem"
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">Settings</span>
                  </Link>

                  <Link
                    to="/history"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                      isHistoryActive ? 'text-brand-500 bg-brand-500/10 border-l-2 border-brand-500 font-semibold' : 'theme-text-primary hover:opacity-75'
                    }`}
                    role="menuitem"
                  >
                    <History className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">History</span>
                  </Link>
                </div>

                <div className="border-t border-slate-700/40 pt-1 mt-1">
                  <button
                    onClick={handleLogoutClick}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors text-left"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Logout Confirmation Dialog */}
      <Modal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        title="Logout Confirmation"
      >
        <div className="space-y-4 text-slate-200">
          <p className="text-sm font-medium">Are you sure you want to logout?</p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setLogoutModalOpen(false)}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              onClick={confirmLogout}
              className="btn-danger text-xs px-4 py-2"
            >
              Logout
            </button>
          </div>
        </div>
      </Modal>

    </header>
  );
};
