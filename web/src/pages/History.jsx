import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Trash2, 
  Download, 
  ExternalLink, 
  Film,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { videoService } from '../services/videoService';
import { formatDate } from '../utils/formatters';
import { Modal } from '../components/Modal';

export const History = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState(() => storageService.getHistory());
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const refreshHistory = () => {
    setHistory(storageService.getHistory());
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  const handleDeleteItem = (id) => {
    const updated = storageService.deleteHistoryItem(id);
    setHistory(updated);
  };

  const handleClearAll = () => {
    storageService.clearHistory();
    setHistory([]);
    setClearModalOpen(false);
  };

  const handleReDownload = async (item) => {
    setDownloadingId(item.id);
    try {
      const filenameHint = item.title ? `${item.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4` : 'video.mp4';
      await videoService.downloadStream(item.sourceUrl, filenameHint);
    } catch (err) {
      // Handled
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-700/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold theme-text-primary tracking-tight flex items-center gap-3">
            <Clock className="w-8 h-8 text-brand-400" />
            Download History
          </h1>
          <p className="theme-text-secondary text-sm mt-1">
            View your previously downloaded videos.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={() => setClearModalOpen(true)}
            className="btn-secondary text-xs text-red-500 border-red-500/30 hover:bg-red-500/10 px-4 py-2 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Clear All History
          </button>
        )}
      </div>

      {/* History Items List or Empty State */}
      {history.length === 0 ? (
        <div className="py-20 text-center space-y-4 rounded-3xl glass-panel p-8 shadow-xl">
          <div className="w-16 h-16 rounded-full btn-secondary flex items-center justify-center mx-auto text-brand-400 shadow-inner">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold theme-text-primary">No Download History</h3>
            <p className="text-sm theme-text-secondary mt-1 max-w-sm mx-auto">
              Your downloaded videos will appear here.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/home')}
              className="btn-primary text-sm px-6 py-2.5 inline-flex items-center gap-2"
            >
              <span>Go to Home</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {history.map((item) => (
            <div 
              key={item.id} 
              className="rounded-2xl glass-panel p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200"
            >
              <div className="flex items-center gap-4 w-full sm:w-auto">
                {/* Thumbnail */}
                <div className="w-20 h-14 rounded-xl btn-secondary overflow-hidden relative shrink-0">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand-400">
                      <Film className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="overflow-hidden flex-1">
                  <h4 className="font-semibold theme-text-primary text-base truncate max-w-md" title={item.title}>
                    {item.title || 'Instagram Video'}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs theme-text-secondary mt-1">
                    <span>Downloaded: {formatDate(item.downloadedAt || item.createdAt)}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Status: {item.status || 'Completed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/40">
                <button
                  onClick={() => handleReDownload(item)}
                  disabled={downloadingId === item.id}
                  className="btn-secondary text-xs px-4 py-2 flex items-center gap-2"
                  title="Download / Open video"
                >
                  <Download className="w-3.5 h-3.5 text-brand-400" />
                  <span>Open</span>
                </button>

                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-2 rounded-xl theme-text-muted hover:text-red-500 transition-colors"
                  title="Delete item"
                  aria-label="Delete item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
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
