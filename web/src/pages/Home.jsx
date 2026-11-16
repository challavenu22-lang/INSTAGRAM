

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Clipboard, AlertCircle, CheckCircle2, Loader2, Link2, Sparkles, Download } from 'lucide-react';
import { videoService } from '../services/videoService';
import { isValidVideoUrl } from '../utils/validators';
import { VideoPreviewCard } from '../components/VideoPreviewCard';
import { Modal } from '../components/Modal';
import { storageService } from '../services/storageService';
import { historyService } from '../services/historyService';
import { firestoreHistoryService } from '../services/firestoreHistoryService';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

export const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
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

  const resetHomePage = () => {
    // 1. Clear session active player storage
    try {
      sessionStorage.removeItem('active_player_video');
    } catch (e) { }

    // 2. Invalidate any in-flight search requests
    searchRequestIdRef.current++;

    // 3. Stop and clear any active video or audio players
    const mediaElements = document.querySelectorAll('video, audio');
    mediaElements.forEach((el) => {
      try {
        el.pause();
        el.currentTime = 0;
        el.removeAttribute('src');
        el.load();
      } catch (e) { }
    });

    // 4. Reset all React state to initial empty values
    setUrl('');
    setVideo(null);
    setLoading(false);
    setDownloading(false);
    setDownloadState('IDLE');
    setError(null);
    setSuccess(null);
    setConfirmModalOpen(false);

    // 5. Clean browser history state
    if (window.history && window.history.replaceState) {
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) { }
    }
  };

  // Listen for reset events fired by Home button / Navbar
  useEffect(() => {
    const handleResetEvent = () => {
      resetHomePage();
    };

    window.addEventListener('app:reset-home', handleResetEvent);
    return () => {
      window.removeEventListener('app:reset-home', handleResetEvent);
    };
  }, []);

  // Sync with router location state and session storage (handles History Open and page refresh)
  useEffect(() => {
    if (location.state?.reset) {
      try {
        sessionStorage.removeItem('active_player_video');
      } catch (e) { }
      resetHomePage();
      navigate('/home', { replace: true, state: {} });
    } else if (location.state?.previewVideo) {
      setVideo(location.state.previewVideo);
      // DO NOT display raw URL in the search input box
      setUrl('');
      setError(null);
      setSuccess(null);
      try {
        sessionStorage.setItem('active_player_video', JSON.stringify(location.state.previewVideo));
      } catch (e) { }
    } else {
      // Check if there is an active video in sessionStorage (supports page refresh without losing selected video!)
      try {
        const saved = sessionStorage.getItem('active_player_video');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.streamUrl || parsed.sourceUrl)) {
            setVideo(parsed);
          }
        }
      } catch (e) { }
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
      }
    } catch (err) {
      console.warn('Clipboard access restricted:', err);
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
      setError('Please paste an Instagram video or image URL.');
      return;
    }

    if (!isValidVideoUrl(currentUrl)) {
      setError('Please enter a valid Instagram URL.');
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
        // Display new result FIRST (supports both video and image)
        setVideo(res.data);
        // Clear input ONLY after successful fetch
        setUrl('');
        try {
          sessionStorage.setItem('active_player_video', JSON.stringify(res.data));
        } catch (e) { }
      } else {
        setVideo(null);
        setError(res.error || res.message || 'Unable to retrieve media stream. Please verify that the Instagram post or reel is public.');
      }
    } catch (err) {
      if (currentRequestId !== searchRequestIdRef.current) {
        return;
      }
      setVideo(null);
      setError(err.message || 'Unable to retrieve media stream. Please verify that the Instagram post or reel is public.');
    } finally {
      if (currentRequestId === searchRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleDownload = async (customTargetUrl = false, customItemIndex = null) => {
    if (downloading || downloadState === 'DOWNLOAD_STARTED') return;

    // Preserve original Instagram post / reel URL for proper history, shortcode and thumbnails
    const originalPostUrl = video?.sourceUrl || (url && isValidVideoUrl(url) ? url.trim() : null);

    let targetUrl = (typeof customTargetUrl === 'string' && customTargetUrl) ? customTargetUrl : (video?.directMediaUrl || video?.sourceUrl || video?.streamUrl || url.trim());
    if (!targetUrl) return;

    // Unwrap proxy stream URLs to get the underlying raw media URL
    if (targetUrl.includes('/api/video/stream?url=')) {
      try {
        const dummyBase = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        const parsedUrl = new URL(targetUrl, dummyBase);
        const queryUrl = parsedUrl.searchParams.get('url');
        if (queryUrl) {
          targetUrl = queryUrl;
        }
      } catch (e) { }
    }

    const itemsList = video?.mediaItems || video?.items;
    let isImg = video?.mediaType === 'image' || video?.isVideo === false || targetUrl.match(/\.(jpg|jpeg|png|webp|gif)/i);

    if (itemsList && typeof customItemIndex === 'number' && itemsList[customItemIndex]) {
      const selectedItem = itemsList[customItemIndex];
      isImg = selectedItem.mediaType === 'image' || selectedItem.isVideo === false;
    }

    const ext = isImg ? '.jpg' : '.mp4';
    const itemTag = typeof customItemIndex === 'number' ? `_${customItemIndex + 1}` : '';
    const defaultFilename = isImg ? `downloaded_image${itemTag}${ext}` : `downloaded_video${itemTag}${ext}`;
    const defaultLabel = isImg ? `Instagram Image${itemTag}` : `Instagram Video${itemTag}`;

    const match = (originalPostUrl || targetUrl || '').match(/\/(reel|p|tv)\/([^\/?#]+)/i);
    const shortcode = match ? match[2] : null;
    const thumbUrl = (shortcode ? `/api/video/thumbnail/${shortcode}.jpg` : '') || video?.thumbnailUrl || '';
    const displayTitle = (shortcode ? `Instagram Video (${shortcode})` : null) || (video?.title && !video.title.includes('http') ? video.title : null) || defaultLabel;

    const sourceUrlCheck = originalPostUrl || targetUrl || video?.sourceUrl;
    const cleanId = storageService.normalizeUrl(sourceUrlCheck);

    setError(null);
    setSuccess(null);
    setDownloading(true);
    setDownloadState('DOWNLOAD_STARTED');

    const userSettings = storageService.getSettings();

    try {
      const titlePrefix = video?.title ? video.title.replace(/[^a-zA-Z0-9_-]/g, '_') : (isImg ? 'Instagram_Image' : 'Instagram_Video');
      const filenameHint = `${titlePrefix}${itemTag}${ext}`;

      // 1. DOWNLOAD FIRST: Wait for actual download stream completion
      const result = await videoService.downloadStream(targetUrl, filenameHint, {
        postUrl: originalPostUrl || targetUrl,
        thumbnailUrl: thumbUrl,
        title: displayTitle
      });

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

        // 4. HISTORY LOGIC: Only save download history for authenticated Google users!
        // In Guest Mode (user == null), NEVER save download history to Firestore, localStorage or IndexedDB.
        if (user?.uid && userSettings.autoSaveHistory !== false) {
          const historyPayload = {
            id: Date.now().toString(),
            title: displayTitle,
            sourceUrl: originalPostUrl || targetUrl,
            thumbnailUrl: thumbUrl,
            status: 'Completed',
            downloadedAt: new Date().toISOString()
          };

          // Save to user's private Firebase Firestore collection under their UID
          try {
            await firestoreHistoryService.saveHistoryItem(user.uid, historyPayload);
          } catch (e) {
            console.error('Error saving history to Firestore:', e);
          }

          // Cache locally under the user's private UID key
          storageService.addHistoryItem(historyPayload, user.uid);
        }
      } else {
        throw new Error('Download process did not complete.');
      }
    } catch (err) {
      setDownloadState('DOWNLOAD_FAILED');
      const errMsg = err.message || 'Unable to download the file. Please try again.';
      setError(errMsg);

      // Show Download Failed notification if enabled
      if (userSettings.notifyFailed !== false) {
        showToast({
          type: 'error',
          title: '✕ Download Failed',
          message: 'Unable to download the file. Please try again.'
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
        {/* Header Container with Video Logo */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 overflow-hidden px-1">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-brand-600/20 border border-brand-500/35 flex items-center justify-center text-brand-400 mx-auto mb-4 shadow-xl shadow-brand-500/10">
            <Download className="w-7 h-7 sm:w-8 sm:h-8 text-brand-400" />
          </div>
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
                  onClick={() => {
                    setUrl('');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2
    !bg-red-500/15 !backdrop-blur-md
    !border !border-red-400/40
    !text-red-400 hover:!bg-red-500/25
    hover:!border-red-400/70 hover:!text-red-300
    !px-3 !py-1 text-xs font-semibold
    !rounded-lg shadow-md
    flex items-center justify-center z-10
    cursor-pointer hover:scale-105 active:scale-95
    transition-all"
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

        {/* Loading Indicator while retrieving video information */}
        {loading && (
          <div className="w-full max-w-3xl mx-auto mt-8 rounded-3xl glass-panel p-8 sm:p-12 shadow-2xl flex flex-col items-center justify-center space-y-3.5 animate-in fade-in duration-200">
            <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
            <div className="text-center space-y-1">
              <h3 className="text-sm sm:text-base font-bold theme-text-primary">
                Retrieving Video Information...
              </h3>
              <p className="text-xs theme-text-secondary">
                Fetching video stream, metadata, and thumbnail preview
              </p>
            </div>
          </div>
        )}

        {/* Video Preview Section */}
        {video && !loading && (
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
