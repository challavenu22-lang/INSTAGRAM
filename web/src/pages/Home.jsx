

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Clipboard, AlertCircle, CheckCircle2, Loader2, Link2, Sparkles } from 'lucide-react';
import { videoService } from '../services/videoService';
import { isValidVideoUrl } from '../utils/validators';
import { VideoPreviewCard } from '../components/VideoPreviewCard';
import { Modal } from '../components/Modal';
import { storageService } from '../services/storageService';
import { historyService } from '../services/historyService';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

export const Home = () => {
  const location = useLocation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadState, setDownloadState] = useState('IDLE'); // 'IDLE' | 'DOWNLOAD_STARTED' | 'DOWNLOAD_SUCCESS' | 'DOWNLOAD_FAILED'
  const [video, setVideo] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [sessionDownloadedUrls, setSessionDownloadedUrls] = useState(new Set());
  const searchRequestIdRef = useRef(0);

  useEffect(() => {
    if (location.state?.previewVideo) {
      setVideo(location.state.previewVideo);
      if (location.state?.initialUrl || location.state?.previewVideo?.sourceUrl) {
        setUrl(location.state.initialUrl || location.state.previewVideo.sourceUrl);
      }
      setError(null);
      setSuccess(null);
    }
  }, [location.state]);

  const handlePaste = async (e) => {
    if (e) {
      e.preventDefault();
    }
    setError(null);
    setSuccess(null);

    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setUrl(text.trim());
          setError(null);
          return;
        }
        if (!text || !text.trim()) {
          setError('Clipboard is empty.');
          return;
        }
      }
      setError('Please allow clipboard access and try Paste again.');
    } catch (err) {
      console.error('Paste failed:', err);
      setError('Please allow clipboard access and try Paste again.');
    }
  };


  const handleSearch = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Clear all previous errors, notifications, download state and previous video result immediately
    setError(null);
    setSuccess(null);
    setDownloadState('IDLE');
    setDownloading(false);
    setVideo(null);

    const currentUrl = url.trim();
    if (!currentUrl) {
      setError('Please paste an Instagram video URL.');
      return;
    }

    if (!isValidVideoUrl(currentUrl)) {
      setError('Please enter a valid Instagram video URL.');
      return;
    }

    const currentRequestId = ++searchRequestIdRef.current;
    setLoading(true);

    try {
      const res = await videoService.search(currentUrl);
      if (currentRequestId !== searchRequestIdRef.current) {
        return;
      }

      if (res.success && res.data) {
        // Display new result FIRST
        setVideo(res.data);
        // Clear input ONLY after successful fetch
        setUrl('');
      } else {
        setError('Unable to find this video. Please check the Instagram URL.');
      }
    } catch (err) {
      if (currentRequestId !== searchRequestIdRef.current) {
        return;
      }
      setError(err.message || 'Unable to find this video. Please check the Instagram URL.');
    } finally {
      if (currentRequestId === searchRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleDownload = async () => {
    if (downloading || downloadState === 'DOWNLOAD_STARTED') return;
    
    const targetUrl = video?.sourceUrl || video?.streamUrl || url.trim();
    if (!targetUrl) return;

    const sourceUrlCheck = video?.sourceUrl || targetUrl;
    const cleanId = storageService.normalizeUrl(sourceUrlCheck);

    setError(null);
    setSuccess(null);
    setDownloading(true);
    setDownloadState('DOWNLOAD_STARTED');

    const userSettings = storageService.getSettings();

    try {
      const filenameHint = video?.title ? `${video.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4` : 'downloaded_video.mp4';
      
      // 1. DOWNLOAD FIRST: Wait for actual download stream completion
      const result = await videoService.downloadStream(targetUrl, filenameHint);

      if (result?.cancelled) {
        // User cancelled Save As dialog: reset state quietly without toast or history
        setDownloadState('IDLE');
        return;
      }

      if (result?.success) {
        // 2. DOWNLOAD_SUCCESS STATE
        setDownloadState('DOWNLOAD_SUCCESS');
        setSuccess('Download completed successfully!');

        // Mark as downloaded in session and local tracking cache
        setSessionDownloadedUrls(prev => {
          const updated = new Set(prev);
          if (sourceUrlCheck) updated.add(sourceUrlCheck);
          if (cleanId) updated.add(cleanId);
          return updated;
        });
        storageService.markAsDownloaded(sourceUrlCheck);

        // 3. SUCCESS NOTIFICATION: Always show in-app toast if notifyComplete is enabled
        if (userSettings.notifyComplete !== false) {
          showToast({
            type: 'success',
            title: '✓ Download Complete',
            message: 'Download completed successfully!'
          });
        }

        // 4. HISTORY LOGIC: Only save if user is AUTHENTICATED
        if (user && user?.id && userSettings.autoSaveHistory !== false) {
          const displayTitle = targetUrl 
            ? `Instagram Video (${targetUrl})` 
            : (video?.title || 'Instagram Video');

          const historyPayload = {
            id: Date.now().toString(),
            title: displayTitle,
            sourceUrl: targetUrl,
            thumbnailUrl: video?.thumbnailUrl || '',
            status: 'Completed',
            downloadedAt: new Date().toISOString()
          };

          // Save to user-scoped local storage
          storageService.addHistoryItem(historyPayload, user.id);

          // Save to backend database for authenticated user if connected
          try {
            await historyService.addHistoryItem({
              title: historyPayload.title,
              sourceUrl: historyPayload.sourceUrl,
              thumbnailUrl: historyPayload.thumbnailUrl,
              status: 'COMPLETED'
            });
          } catch (e) {
            // Ignore backend API error
          }
        }
      } else {
        throw new Error('Download process did not complete.');
      }
    } catch (err) {
      setDownloadState('DOWNLOAD_FAILED');
      const errMsg = err.message || 'Unable to download the video. Please try again.';
      setError(errMsg);

      // Show Download Failed notification if enabled
      if (userSettings.notifyFailed !== false) {
        showToast({
          type: 'error',
          title: '✕ Download Failed',
          message: 'Unable to download the video. Please try again.'
        });
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-80px)] py-8 sm:py-14 overflow-hidden">
      {/* Decorative Background Accents */}
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-70 z-0" />
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute top-1/3 -right-24 w-96 h-96 bg-blue-500/15 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute -bottom-24 left-10 w-80 h-80 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none z-0" />

      <Sparkles className="hidden sm:block absolute top-20 right-1/4 w-6 h-6 text-brand-400/40 animate-pulse pointer-events-none z-0" />
      <Sparkles className="hidden sm:block absolute bottom-36 left-1/4 w-5 h-5 text-indigo-400/40 animate-pulse pointer-events-none z-0" />

      <div className="relative z-10 w-[calc(100%-32px)] max-w-4xl mx-auto px-0 sm:px-6">
        {/* Header Container */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 overflow-hidden px-1">
          <h1 className="home-heading text-[clamp(18px,5.4vw,48px)] font-extrabold theme-text-primary tracking-tight leading-tight whitespace-nowrap text-center">
            Instagram Video Downloader
          </h1>
          <p className="theme-text-secondary text-sm sm:text-lg mt-3 leading-relaxed font-medium">
            Download videos you own or have permission to use.
          </p>
        </div>

        {/* Main Input Box Container */}
        <div className="rounded-3xl glass-panel p-5 sm:p-8 shadow-2xl relative w-full box-border">
          <form onSubmit={handleSearch} className="space-y-5 sm:space-y-6">
            <div className="relative w-full">
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                  setSuccess(null);
                }}
                onPaste={(e) => {
                  const pastedText = e.clipboardData?.getData('text');
                  if (pastedText) {
                    setUrl(pastedText.trim());
                    setError(null);
                  }
                }}
                placeholder="Paste valid Instagram video URL here (e.g. https://www.instagram.com/reel/...)"
                className="input-field text-xs sm:text-base py-3.5 sm:py-4 px-4 sm:px-5 !pr-20 sm:!pr-24 shadow-inner w-full box-border font-medium"
                disabled={loading || downloading}
              />
              {url && (
                <button
                  type="button"
                  onClick={() => { setUrl(''); setError(null); setSuccess(null); }}
                  className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 btn-secondary !px-3 !py-1 text-xs font-semibold !rounded-lg shadow-md flex items-center justify-center z-10 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  title="Clear input"
                >
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Action Buttons: Paste and Search Side-by-Side */}
            <div className="action-buttons flex flex-row items-center justify-center gap-2.5 sm:gap-4 pt-1 w-full">
              <button
                type="button"
                onClick={handlePaste}
                disabled={loading || downloading}
                className="btn-paste flex-1 min-w-0 py-3.5 px-2 sm:px-5 text-xs sm:text-base font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap h-12"
              >
                <Clipboard className="w-4 h-4 sm:w-5 sm:h-5 text-amber-800 shrink-0" />
                <span className="truncate">Paste</span>
              </button>

              <button
                type="submit"
                disabled={loading || downloading || !url.trim()}
                className="btn-primary bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex-1 min-w-0 py-3.5 px-2 sm:px-5 text-xs sm:text-base font-semibold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-1.5 whitespace-nowrap h-12 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin shrink-0" />
                    <span className="truncate">Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="truncate">Search</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Feedback Alerts */}
          {error && (
            <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}
        </div>

        {/* Video Preview Section */}
        {video && (
          <VideoPreviewCard 
            key={video.sourceUrl || video.streamUrl || video.title}
            video={video} 
            onDownload={handleDownload} 
            downloading={downloading}
          />
        )}

        {/* Footer Info Cards */}
        <div className="mt-10 text-center max-w-lg mx-auto leading-relaxed space-y-3">
          <div className="glass-panel px-5 py-3.5 rounded-2xl border shadow-sm text-xs theme-text-primary font-medium inline-block">
            <p>
              ⚡ <strong>Fast & Easy Downloads</strong>: Paste an Instagram video URL above and download your video in seconds.
            </p>
          </div>

          <div className="glass-panel px-5 py-3.5 rounded-2xl border shadow-sm text-xs theme-text-primary font-medium inline-block">
            <p>
              🔐 <strong>Secure & Personalized:</strong> Log in to save your download history securely and access it anytime from your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
