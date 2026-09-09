import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Settings, 
  History, 
  LogOut, 
  MoreVertical,
  User,
  UserRound,
  LogIn,
  Download
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useClickOutside } from '../hooks/useClickOutside';
import { Modal } from './Modal';

// Solid filled white house icon with door cutout
const HomeIcon = ({ className = "w-6 h-6 sm:w-7 sm:h-7 text-white shrink-0" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path 
      fillRule="evenodd" 
      clipRule="evenodd" 
      d="M12 3L2.5 10.5A1 1 0 0 0 3.2 12H4v8a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 20v-8h.8a1 1 0 0 0 .7-1.7L12 3zM10 21.5v-6.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v6.5h-4z" 
    />
  </svg>
);

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

  const isLoginPage = location.pathname === '/login';

  const displayedUserName = user?.name || user?.fullName || user?.userName || user?.username || user?.email?.split('@')[0] || 'User';
  const firstLetter = displayedUserName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Top-Left: Home Navigation Link (Cleaner Modern White House Icon + Text) */}
        <Link 
          to="/home" 
          aria-label="Home"
          className="relative z-50 flex items-center gap-2.5 px-1 py-1 theme-text-primary hover:opacity-85 transition-opacity duration-200 focus:outline-none"
        >
          <HomeIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white shrink-0" />
          <span className="text-lg sm:text-xl font-bold tracking-tight theme-text-primary whitespace-nowrap">Home</span>
        </Link>

        {/* Top Right Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div 
            className={`transition-all duration-200 ${isOpen ? 'blur-[5px] opacity-75 pointer-events-none select-none' : 'blur-none opacity-100 pointer-events-auto'}`}
            aria-hidden={isOpen}
          >
            {user ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 theme-text-primary text-xs font-semibold shadow-sm">
                {user?.picture ? (
                  <img 
                    src={user.picture} 
                    alt={displayedUserName} 
                    className="w-6 h-6 rounded-full object-cover border border-brand-500/40 shrink-0 select-none" 
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-brand-600/30 border border-brand-500/40 text-brand-400 flex items-center justify-center text-xs font-bold shrink-0 uppercase select-none">
                    {firstLetter}
                  </div>
                )}
                <span className="truncate max-w-[120px] sm:max-w-[160px] text-xs font-semibold theme-text-primary">
                  {displayedUserName}
                </span>
              </div>
            ) : (
              <div className="relative z-50">
                {isLoginPage ? (
                  <button
                    type="button"
                    disabled
                    onClick={(e) => e.preventDefault()}
                    className="bg-blue-900 border border-blue-700/60 text-white font-medium rounded-xl transition-all duration-200 shadow-md shadow-blue-950/40 text-sm px-4 py-2 opacity-50 cursor-not-allowed pointer-events-auto select-none flex items-center gap-2"
                    style={{ cursor: 'not-allowed' }}
                    aria-disabled="true"
                  >
                    <UserRound size={20} strokeWidth={2} className="shrink-0 text-white" />
                    <span>Sign In</span>
                  </button>
                ) : (
                  <Link to="/login" className="bg-blue-900 hover:bg-blue-800 active:bg-blue-950 border border-blue-700/60 text-white font-medium rounded-xl transition-all duration-200 shadow-md shadow-blue-950/40 text-sm px-4 py-2 flex items-center gap-2">
                    <UserRound size={20} strokeWidth={2} className="shrink-0 text-white" />
                    <span>Sign In</span>
                  </Link>
                )}
              </div>
            )}
          </div>

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
              className="p-1.5 sm:p-2 bg-transparent border-0 border-none shadow-none theme-text-primary hover:text-brand-400 transition-colors duration-200 flex items-center justify-center focus:outline-none cursor-pointer relative z-50"
            >
              <MoreVertical className="w-5.5 h-5.5" />
            </button>

            {/* Backdrop Overlay to blur background page content (below header) when menu is open */}
            {isOpen && (
              <div 
                className="fixed top-16 inset-x-0 bottom-0 z-40 transition-opacity animate-in fade-in duration-150 pointer-events-auto"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)'
                }}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
              />
            )}

            {/* Dropdown Menu Container with WHITE highlight border (Compact & Slim) */}
            {isOpen && (
              <div 
                className="absolute right-0 mt-2 w-48 rounded-xl shadow-2xl py-1 animate-in fade-in slide-in-from-top-2 duration-150 z-50 border border-white/50 theme-text-primary overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                style={{ 
                  backgroundColor: 'rgba(10, 20, 35, 0.94)', 
                  backdropFilter: 'none', 
                  WebkitBackdropFilter: 'none' 
                }}
                role="menu"
                aria-orientation="vertical"
              >
                {user ? (
                  <div className="py-1">
                    {/* User Header in Menu: logo letter + userName */}
                    <div className="px-3 py-2 flex items-center gap-2 border-b border-white/20 text-xs font-bold theme-text-primary">
                      {user?.picture ? (
                        <img 
                          src={user.picture} 
                          alt={displayedUserName} 
                          className="w-5 h-5 rounded-full object-cover border border-brand-500/40 shrink-0 select-none" 
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-brand-600/30 border border-brand-500/40 text-brand-400 flex items-center justify-center text-[10px] font-bold shrink-0 uppercase select-none">
                          {firstLetter}
                        </div>
                      )}
                      <span className="truncate text-xs font-semibold">{displayedUserName}</span>
                    </div>

                    {/* Navigation Items */}
                    <div className="py-1 space-y-0.5">
                      <Link
                        to="/home"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                          isHomeActive ? 'text-brand-500 bg-brand-500/10 border-l-2 border-brand-500 font-semibold' : 'theme-text-primary hover:opacity-75'
                        }`}
                        role="menuitem"
                      >
                        <HomeIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">Home</span>
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                          isSettingsActive ? 'text-brand-500 bg-brand-500/10 border-l-2 border-brand-500 font-semibold' : 'theme-text-primary hover:opacity-75'
                        }`}
                        role="menuitem"
                      >
                        <Settings className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">Settings</span>
                      </Link>

                      <Link
                        to="/history"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                          isHistoryActive ? 'text-brand-500 bg-brand-500/10 border-l-2 border-brand-500 font-semibold' : 'theme-text-primary hover:opacity-75'
                        }`}
                        role="menuitem"
                      >
                        <History className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">History</span>
                      </Link>
                    </div>

                    {/* Logout Option */}
                    <div className="border-t border-white/20 pt-1 mt-0.5">
                      <button
                        onClick={handleLogoutClick}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                        role="menuitem"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">Logout</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 py-1">
                    <div className="py-0.5 space-y-0.5">
                      <Link
                        to="/home"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                          isHomeActive ? 'text-brand-500 bg-brand-500/10 border-l-2 border-brand-500 font-semibold' : 'theme-text-primary hover:opacity-75'
                        }`}
                        role="menuitem"
                      >
                        <HomeIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">Home</span>
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                          isSettingsActive ? 'text-brand-500 bg-brand-500/10 border-l-2 border-brand-500 font-semibold' : 'theme-text-primary hover:opacity-75'
                        }`}
                        role="menuitem"
                      >
                        <Settings className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">Settings</span>
                      </Link>

                      <Link
                        to="/history"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                          isHistoryActive ? 'text-brand-500 bg-brand-500/10 border-l-2 border-brand-500 font-semibold' : 'theme-text-primary hover:opacity-75'
                        }`}
                        role="menuitem"
                      >
                        <History className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">History</span>
                      </Link>
                    </div>

                    <div className="border-t border-white/20 my-0.5 pt-1 space-y-1 pb-0.5">
                      <div className="px-3 py-0.5 flex items-center gap-2 text-[11px] sm:text-xs font-semibold theme-text-secondary select-none">
                        <User className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                        <span>Guest Account</span>
                      </div>
                      <div className="px-3 flex justify-start">
                        {isLoginPage ? (
                          <button
                            type="button"
                            disabled
                            onClick={(e) => e.preventDefault()}
                            className="px-3 py-1 text-xs font-semibold text-white bg-blue-900 border border-blue-700/60 rounded-lg opacity-50 cursor-not-allowed pointer-events-auto select-none inline-flex items-center gap-1.5"
                            style={{ cursor: 'not-allowed' }}
                            aria-disabled="true"
                          >
                            <LogIn size={15} strokeWidth={2} className="shrink-0 text-white rotate-90" />
                            <span className="whitespace-nowrap">Login</span>
                          </button>
                        ) : (
                          <Link
                            to="/login"
                            onClick={() => setIsOpen(false)}
                            className="px-3 py-1 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 active:bg-blue-950 border border-blue-700/60 rounded-lg transition-all duration-200 shadow-md shadow-blue-950/40 inline-flex items-center gap-1.5"
                            role="menuitem"
                          >
                            <LogIn size={15} strokeWidth={2} className="shrink-0 text-white rotate-90" />
                            <span className="whitespace-nowrap">Login</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
