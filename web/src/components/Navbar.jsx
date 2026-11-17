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
      let userFriendlyMsg = err?.message || 'Unable to sign in with Google. Please check Firebase config in .env.';
      if (err?.code === 'auth/api-key-not-valid' || err?.message?.includes('api-key-not-valid')) {
        userFriendlyMsg = 'Firebase API key is invalid. Please verify VITE_FIREBASE_API_KEY in web/.env.';
      } else if (err?.code === 'auth/unauthorized-domain') {
        userFriendlyMsg = 'This domain is not authorized in Firebase Console. Add it under Authentication > Settings > Authorized domains.';
      } else if (err?.code === 'auth/operation-not-allowed') {
        userFriendlyMsg = 'Google Sign-in is not enabled in Firebase Console. Please enable it under Authentication > Sign-in method.';
      }
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Sign-in Failed',
          message: userFriendlyMsg
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
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            /* Logged-In User Profile Info in Navbar (Completely unblurred & clear) */
            <div className="account-btn flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-xs font-semibold shadow-sm select-none">
              {user?.picture ? (
                <img 
                  src={user.picture} 
                  alt={displayedUserName} 
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover border border-blue-500/40 shrink-0 select-none" 
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0 uppercase select-none">
                  {firstLetter}
                </div>
              )}
              <span className="truncate max-w-[120px] sm:max-w-[160px] text-xs font-semibold text-slate-100">
                {displayedUserName}
              </span>
            </div>
          ) : (
            /* Logged-Out State: Clearly Visible Login Button */
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-medium text-xs sm:text-sm shadow-md transition-all cursor-pointer focus:outline-none"
              title="Login"
            >
              <User className="w-4 h-4 text-white" />
              <span>{isSigningIn ? 'Logging in...' : 'Login'}</span>
            </button>
          )}

          {/* Three-Dot Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
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
              className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-800/60 text-slate-300 hover:text-white transition-colors duration-150 flex items-center justify-center focus:outline-none cursor-pointer relative z-50"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Backdrop for outside click / dismiss without blurring navbar items */}
            {isOpen && (
              <div 
                className="fixed inset-0 z-40 bg-black/20 transition-opacity animate-in fade-in duration-150"
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
              />
            )}

            {/* Dropdown Menu Container */}
            {isOpen && (
              <div 
                className="absolute right-0 mt-2 w-52 sm:w-56 rounded-2xl shadow-2xl py-1 animate-in fade-in slide-in-from-top-2 duration-150 z-50 border border-slate-700/80 overflow-hidden shadow-black/80"
                style={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                  backdropFilter: 'blur(12px)', 
                  WebkitBackdropFilter: 'blur(12px)' 
                }}
                role="menu"
                aria-orientation="vertical"
              >
                {user ? (
                  <div className="py-1">
                    {/* Profile picture and username at top of menu */}
                    <div className="px-3.5 py-2.5 flex items-center gap-2.5 border-b border-slate-700/60">
                      {user?.picture ? (
                        <img 
                          src={user.picture} 
                          alt={displayedUserName} 
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover border border-blue-500/40 shrink-0 select-none" 
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0 uppercase select-none">
                          {firstLetter}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-slate-100">{displayedUserName}</div>
                        {user?.email && (
                          <div className="truncate text-[10px] text-slate-400">{user.email}</div>
                        )}
                      </div>
                    </div>

                    {/* Nav Items */}
                    <div className="py-1 space-y-0.5">
                      <Link
                        to="/home"
                        onClick={handleHomeNavigation}
                        className={`flex items-center gap-2.5 px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors ${
                          isHomeActive 
                            ? 'text-blue-400 bg-blue-500/15 border-l-2 border-blue-500 font-semibold' 
                            : 'text-slate-200 hover:text-white hover:bg-white/5'
                        }`}
                        role="menuitem"
                      >
                        <HomeIcon className="w-4 h-4 shrink-0" />
                        <span>Home</span>
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors ${
                          isSettingsActive 
                            ? 'text-blue-400 bg-blue-500/15 border-l-2 border-blue-500 font-semibold' 
                            : 'text-slate-200 hover:text-white hover:bg-white/5'
                        }`}
                        role="menuitem"
                      >
                        <Settings className="w-4 h-4 shrink-0" />
                        <span>Settings</span>
                      </Link>

                      <Link
                        to="/history"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors ${
                          isHistoryActive 
                            ? 'text-blue-400 bg-blue-500/15 border-l-2 border-blue-500 font-semibold' 
                            : 'text-slate-200 hover:text-white hover:bg-white/5'
                        }`}
                        role="menuitem"
                      >
                        <History className="w-4 h-4 shrink-0" />
                        <span>History</span>
                      </Link>
                    </div>

                    {/* Logout Option in RED */}
                    <div className="border-t border-slate-700/60 pt-1 mt-1">
                      <button
                        type="button"
                        onClick={handleLogoutClick}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left cursor-pointer"
                        role="menuitem"
                      >
                        <LogOut className="w-4 h-4 shrink-0 text-red-400" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Guest Navigation Menu (No logged-in user information) */
                  <div className="py-1 space-y-0.5">
                    <Link
                      to="/home"
                      onClick={handleHomeNavigation}
                      className={`flex items-center gap-2.5 px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors ${
                        isHomeActive 
                          ? 'text-blue-400 bg-blue-500/15 border-l-2 border-blue-500 font-semibold' 
                          : 'text-slate-200 hover:text-white hover:bg-white/5'
                      }`}
                      role="menuitem"
                    >
                      <HomeIcon className="w-4 h-4 shrink-0" />
                      <span>Home</span>
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors ${
                        isSettingsActive 
                          ? 'text-blue-400 bg-blue-500/15 border-l-2 border-blue-500 font-semibold' 
                          : 'text-slate-200 hover:text-white hover:bg-white/5'
                      }`}
                      role="menuitem"
                    >
                      <Settings className="w-4 h-4 shrink-0" />
                      <span>Settings</span>
                    </Link>

                    <Link
                      to="/history"
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors ${
                        isHistoryActive 
                          ? 'text-blue-400 bg-blue-500/15 border-l-2 border-blue-500 font-semibold' 
                          : 'text-slate-200 hover:text-white hover:bg-white/5'
                      }`}
                      role="menuitem"
                    >
                      <History className="w-4 h-4 shrink-0" />
                      <span>History</span>
                    </Link>

                    <div className="border-t border-slate-700/60 pt-1 mt-1">
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-colors text-left cursor-pointer"
                        role="menuitem"
                      >
                        <User className="w-4 h-4 shrink-0 text-blue-400" />
                        <span>Login</span>
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
