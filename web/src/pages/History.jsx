import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Trash2, 
  Download, 
  ExternalLink, 
  Film,
  AlertTriangle,
  ArrowRight,
  User
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { historyService } from '../services/historyService';
import { videoService } from '../services/videoService';
import { formatDate } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { useAuth } from '../hooks/useAuth';

export const History = () => {
  const navigate = useNavigate();
  const { user, loginWithGoogle } = useAuth();
  const [history, setHistory] = useState(() => storageService.getHistory(user?.id));
  const [clearModalOpen, setClearModalOpen] = useState(false);

  const refreshHistory = async () => {
    if (!user) {
      setHistory([]);
      return;
    }

    // Fetch persistent backend history
    try {
      const res = await historyService.getHistory();
      const items = res?.data?.items || res?.items;
      if (Array.isArray(items)) {
        const mapped = items.map(item => ({
          id: item.id,
          title: item.title,
          sourceUrl: item.sourceUrl,
          thumbnailUrl: item.thumbnailUrl,
          status: item.status,
          downloadedAt: item.createdAt
        }));
        setHistory(mapped);
        try {
          localStorage.setItem(`download_history_${user.id}`, JSON.stringify(mapped));
        } catch (e) {}
        return;
      }
    } catch (err) {
      // Offline fallback
    }

    // Fallback to local storage for offline support
    const local = storageService.getHistory(user.id);
    setHistory(local);
  };

  useEffect(() => {
    refreshHistory();
  }, [user]);

  const handleDeleteItem = async (id) => {
    if (!user) return;
    const updated = storageService.deleteHistoryItem(id, user.id);
    setHistory(updated);
    try {
      await historyService.deleteItem(id);
    } catch (e) {
      // Ignore API error
    }
  };

  const handleClearAll = async () => {
    if (!user) return;
    storageService.clearHistory(user.id);
    setHistory([]);
    setClearModalOpen(false);
    try {
      await historyService.clearAll();
    } catch (e) {
      // Ignore API error
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      if (loginWithGoogle) {
        await loginWithGoogle();
      } else {
        navigate('/login');
      }
    } catch (err) {
      navigate('/login');
    }
  };

  const handleOpenVideo = (item) => {
    const videoPayload = {
      sourceUrl: item.sourceUrl,
      title: item.title || 'Instagram Video',
      thumbnailUrl: item.thumbnailUrl,
      streamUrl: item.streamUrl || `/api/video/stream?url=${encodeURIComponent(item.sourceUrl)}`
    };
    navigate('/home', { state: { previewVideo: videoPayload, initialUrl: item.sourceUrl } });
  };

  return (
    <div className="max-w-5xl mx-auto py-5 sm:py-10 px-3 sm:px-6 space-y-4 sm:space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-row items-start justify-between gap-2 border-b border-slate-700/40 pb-3 sm:pb-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-3xl font-extrabold theme-text-primary tracking-tight flex items-center gap-2 sm:gap-3">
            <Clock className="w-5 h-5 sm:w-8 sm:h-8 text-brand-400 shrink-0" />
            <span>Download History</span>
          </h1>
          <p className="theme-text-secondary text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">
            {user ? (
              <span>
                Download history for <strong className="theme-text-primary">{user.userName || user.username || user.fullName || user.name}</strong>
              </span>
            ) : (
              <span>View your previously downloaded videos.</span>
            )}
          </p>
        </div>

        {user && history.length > 0 && (
          <button
            onClick={() => setClearModalOpen(true)}
            className="text-[11px] sm:text-xs text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl flex items-center gap-1.5 sm:gap-2 transition-colors font-medium whitespace-nowrap shrink-0 mt-0.5 sm:mt-0"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" /> Clear All History
          </button>
        )}
      </div>

      {/* Guest Account Empty State when NOT logged in */}
      {!user ? (
        <div className="w-[calc(100%-32px)] max-w-sm sm:max-w-md mx-auto py-4 px-4 sm:py-5 sm:px-6 rounded-2xl glass-panel shadow-lg flex flex-col items-center justify-center text-center space-y-2.5 my-1 box-border">
          {/* Guest Account Icon - Compact badge */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800/90 border border-slate-700/80 flex items-center justify-center mx-auto text-brand-400 shadow-inner shrink-0 p-0">
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-brand-400 shrink-0 stroke-[2.25]" />
          </div>
          
          <div className="space-y-0.5 w-full">
            <h3 className="text-base sm:text-lg font-bold theme-text-primary">Guest Account</h3>
            <p className="text-xs sm:text-xs theme-text-secondary max-w-xs sm:max-w-sm mx-auto leading-normal">
              Your downloaded videos will appear here but this is guest account so please login.
            </p>
          </div>

          <div className="pt-0.5 flex justify-center w-full">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn-primary text-xs px-5 py-1.5 sm:px-6 sm:py-2 inline-flex items-center justify-center gap-2"
            >
              <span>Login</span>
            </button>
          </div>
        </div>
      ) : history.length === 0 ? (
        /* Authenticated User with No Downloads */
        <div className="w-[calc(100%-32px)] max-w-sm sm:max-w-md mx-auto py-4 px-4 sm:py-5 sm:px-6 rounded-2xl glass-panel shadow-lg flex flex-col items-center justify-center text-center space-y-2.5 my-1 box-border">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800/90 border border-slate-700/80 flex items-center justify-center mx-auto text-brand-400 shadow-inner shrink-0 p-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-brand-400 shrink-0 stroke-[2.25]" />
          </div>
          <div className="space-y-0.5 w-full">
            <h3 className="text-base sm:text-lg font-bold theme-text-primary">No Download History</h3>
            <p className="text-xs sm:text-xs theme-text-secondary max-w-xs mx-auto">
              Your downloaded videos will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:gap-4">
          {history.map((item) => {
            const rawUrl = item.sourceUrl || item.url || '';
            const displayTitle = (rawUrl && rawUrl.startsWith('http'))
              ? `Instagram Video (${rawUrl})`
              : (item.title && item.title.match(/^Instagram Video \([A-Za-z0-9_-]{3,25}\)$/)
                  ? 'Instagram Video'
                  : (item.title || 'Instagram Video'));

            return (
              <div 
                key={item.id} 
                className="rounded-2xl glass-panel p-3 sm:p-5 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 transition-all duration-200"
              >
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto overflow-hidden">
                  {/* Thumbnail */}
                  <div className="w-16 h-12 sm:w-20 sm:h-14 rounded-xl btn-secondary overflow-hidden relative shrink-0">
                    {item.thumbnailUrl ? (
                      <img 
                        src={item.thumbnailUrl} 
                        alt={displayTitle} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextSibling) {
                            e.currentTarget.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-full h-full flex items-center justify-center text-brand-400"
                      style={{ display: item.thumbnailUrl ? 'none' : 'flex' }}
                    >
                      <Film className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="overflow-hidden flex-1 min-w-0">
                    <h4 className="font-semibold theme-text-primary text-xs sm:text-base truncate max-w-full sm:max-w-md" title={displayTitle}>
                      {displayTitle}
                    </h4>
                    <div className="flex flex-row items-center text-[11px] sm:text-xs theme-text-secondary mt-0.5 sm:mt-1">
                      <span>Downloaded: {formatDate(item.downloadedAt || item.createdAt)}</span>
                      <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-3">
                        Status: {item.status || 'Completed'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons & Mobile Status */}
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                  <div className="flex sm:hidden items-center">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Status: {item.status || 'Completed'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <button
                      onClick={() => handleOpenVideo(item)}
                      className="text-[11px] sm:text-xs text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl flex items-center gap-1.5 sm:gap-2 transition-colors font-medium"
                      title="Open video preview"
                    >
                      <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                      <span>Open</span>
                    </button>

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 sm:p-2 rounded-xl text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete item"
                      aria-label="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 hover:text-red-400" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CLEAR ALL CONFIRMATION MODAL */}
      <Modal
        isOpen={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        title="Clear all download history?"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              This action cannot be undone.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setClearModalOpen(false)}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              onClick={handleClearAll}
              className="btn-danger text-xs px-4 py-2"
            >
              Clear History
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
