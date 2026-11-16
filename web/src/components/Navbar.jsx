import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Settings, 
  History, 
  LogOut, 
  MoreVertical,
  User
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useClickOutside } from '../hooks/useClickOutside';
import { Modal } from './Modal';

// Clean Google SVG Icon
export const GoogleIcon = ({ className = "w-4 h-4 shrink-0" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

// Solid filled house icon with door cutout
const HomeIcon = ({ className = "w-6 h-6 sm:w-7 sm:h-7 text-current shrink-0" }) => (
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
  const { user, loginWithGoogle, logout } = useAuth();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
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

  const handleGoogleSignIn = async () => {
    setIsOpen(false);
    setIsSigningIn(true);
    try {
      await loginWithGoogle();
      if (showToast) {
        showToast({
          type: 'success',
          title: '✓ Welcome!',
          message: 'Signed in with Google. Your history will now be saved.'
        });
      }
    } catch (err) {
      if (err?.code === 'auth/popup-closed-by-user') {
        return;
      }
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Sign-in Failed',
          message: err?.message || 'Unable to sign in with Google. Please check Firebase config in .env.'
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    setLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    setLogoutModalOpen(false);
    await logout();
    if (showToast) {
      showToast({
        type: 'info',
        title: 'Logged Out',
        message: 'Returned to Guest Mode. History saving is disabled.'
      });
    }
    navigate('/home');
  };

  const isHomeActive = location.pathname === '/home' || location.pathname === '/';
  const isSettingsActive = location.pathname === '/settings';
  const isHistoryActive = location.pathname === '/history';

  const handleHomeNavigation = (e) => {
    if (e && (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey)) {
      e.preventDefault();
    }
    setIsOpen(false);

    // Stop and clear any playing video/audio across the document
    const mediaElements = document.querySelectorAll('video, audio');
    mediaElements.forEach((el) => {
      try {
        el.pause();
        el.currentTime = 0;
        el.removeAttribute('src');
        el.load();
      } catch (err) {}
    });

    try {
      sessionStorage.removeItem('active_player_video');
    } catch (err) {}

    // Notify Home page to completely reset state immediately
    window.dispatchEvent(new CustomEvent('app:reset-home'));

    // Navigate to /home with reset state flag and unique timestamp
    navigate('/home', { state: { reset: true, timestamp: Date.now() } });
  };

  const displayedUserName = user?.name || user?.fullName || user?.userName || user?.username || user?.email?.split('@')[0] || 'User';
  const firstLetter = displayedUserName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Top-Left: Home Navigation Link (Cleaner Modern White House Icon + Text) */}
        <Link 
          to="/home" 
          onClick={handleHomeNavigation}
          aria-label="Home"
          className="relative z-50 flex items-center gap-2.5 px-1 py-1 theme-text-primary hover:opacity-85 transition-opacity duration-200 focus:outline-none"
        >
          <HomeIcon className="w-6 h-6 sm:w-7 sm:h-7 text-current shrink-0" />
          <span className="text-lg sm:text-xl font-bold tracking-tight theme-text-primary whitespace-nowrap">Home</span>
        </Link>

        {/* Top Right Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {!user ? (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95 border border-slate-200"
              title="Continue with Google"
            >
              <GoogleIcon className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isSigningIn ? 'Signing In...' : 'Continue with Google'}
              </span>
              <span className="sm:hidden">
                {isSigningIn ? '...' : 'Sign In'}
              </span>
            </button>
          ) : (
            <div 
              className={`transition-all duration-200 ${isOpen ? 'blur-[5px] opacity-75 pointer-events-none select-none' : 'blur-none opacity-100 pointer-events-auto'}`}
              aria-hidden={isOpen}
            >
              <div className="account-btn flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 theme-text-primary text-xs font-semibold shadow-sm">
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
            </div>
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
                        onClick={handleHomeNavigation}
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
                  <div className="py-1 space-y-0.5">
                    <Link
                      to="/home"
                      onClick={handleHomeNavigation}
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

                    {/* Google Login Option for Guests */}
                    <div className="border-t border-white/20 pt-1 mt-0.5">
                      <button
                        onClick={handleGoogleSignIn}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                        role="menuitem"
                      >
                        <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">Continue with Google</span>
                      </button>
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
        <div className="modal-body space-y-4 text-slate-200">
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
