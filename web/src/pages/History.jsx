import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Clock,
  Trash2,
  ExternalLink,
  Film,
  AlertTriangle,
  ArrowLeft,
  X,
  Copy,
  Check,
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Loader2,
  AlertCircle,
  ChevronRight,
  User,
  MapPin
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { historyService } from '../services/historyService';
import { firestoreHistoryService } from '../services/firestoreHistoryService';
import { formatDate } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getApiBaseUrl } from '../services/api';
import { GoogleIcon } from '../components/Navbar';

// --- HISTORY DETAILS VIDEO PLAYER COMPONENT ---
const DetailsVideoPlayer = ({ item, cleanTitle, thumbUrl, streamUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimerRef = useRef(null);

  useEffect(() => {
    const onFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('webkitfullscreenchange', onFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('webkitfullscreenchange', onFullscreen);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  const handleActivity = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (isPlaying) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3500);
    }
  };

  const togglePlay = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          el.muted = true;
          setIsMuted(true);
          el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        });
    } else {
      el.pause();
      setIsPlaying(false);
    }
    handleActivity();
  };

  const toggleMute = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const el = videoRef.current;
    if (!el) return;
    if (isMuted || el.muted) {
      el.muted = false;
      setIsMuted(false);
      if (volume === 0) {
        setVolume(1);
        el.volume = 1;
      }
    } else {
      el.muted = true;
      setIsMuted(true);
    }
    handleActivity();
  };

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    const el = videoRef.current;
    if (el) {
      el.volume = v;
      if (v === 0) {
        el.muted = true;
        setIsMuted(true);
      } else if (isMuted) {
        el.muted = false;
        setIsMuted(false);
      }
    }
    handleActivity();
  };

  const handleSeek = (e) => {
    const s = parseFloat(e.target.value);
    setCurrentTime(s);
    if (videoRef.current) {
      videoRef.current.currentTime = s;
    }
    handleActivity();
  };

  const handleSkip = (sec, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(Math.max(0, videoRef.current.currentTime + sec), duration || Infinity);
    }
    handleActivity();
  };

  const toggleFullscreen = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const c = containerRef.current;
    if (!c) return;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (c.requestFullscreen) c.requestFullscreen().catch(() => { });
      else if (c.webkitRequestFullscreen) c.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
    handleActivity();
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const total = Math.floor(time);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleActivity}
      onMouseEnter={() => setShowControls(true)}
      onTouchStart={handleActivity}
      className="w-full rounded-2xl overflow-hidden bg-black border border-slate-700/60 shadow-2xl flex items-center justify-center relative min-h-[300px] sm:min-h-[420px] select-none group"
    >
      {/* Loading Overlay */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] z-30 pointer-events-none">
          <div className="flex flex-col items-center justify-center space-y-2 p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-2xl">
            <Loader2 className="w-7 h-7 text-brand-400 animate-spin" />
            <span className="text-xs font-semibold text-slate-200">Loading video preview...</span>
          </div>
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 z-20">
          <AlertCircle className="w-10 h-10 text-amber-400" />
          <p className="text-sm font-medium text-slate-300">Unable to load this video preview.</p>
          <button
            type="button"
            onClick={() => {
              setError(false);
              setLoading(true);
              if (videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(() => { });
              }
            }}
            className="btn-secondary text-xs px-4 py-2 mt-1 cursor-pointer"
          >
            Retry Playback
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={streamUrl}
            poster={thumbUrl}
            autoPlay={false}
            muted={isMuted}
            playsInline
            preload="metadata"
            onClick={togglePlay}
            onTimeUpdate={() => {
              if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
                setLoading(false);
              }
            }}
            onDurationChange={() => {
              if (videoRef.current) setDuration(videoRef.current.duration);
            }}
            onPlay={() => {
              setIsPlaying(true);
              setLoading(false);
            }}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setLoading(true)}
            onPlaying={() => setLoading(false)}
            onCanPlay={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            className="w-full max-h-[560px] bg-black object-contain cursor-pointer"
          >
            <source src={streamUrl} type="video/mp4" />
            Your browser does not support HTML5 video.
          </video>

          {/* Big Center Play Button when paused (Clean White Triangle without red circle) */}
          {!isPlaying && !loading && !error && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer bg-black/25 transition-all"
            >
              <button
                type="button"
                onClick={togglePlay}
                aria-label="Play video"
                className="p-3 sm:p-4 text-white flex items-center justify-center hover:scale-115 active:scale-95 transition-transform duration-200 cursor-pointer focus:outline-none select-none"
              >
                <Play className="w-16 h-16 sm:w-20 sm:h-20 ml-1.5 fill-white text-white shrink-0 drop-shadow-[0_4px_14px_rgba(0,0,0,0.85)]" />
              </button>
            </div>
          )}

          {/* Custom Dark-Themed Player Controls Bar Overlay */}
          <div
            className={`absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 sm:p-4 pt-8 flex flex-col gap-2 transition-all duration-300 ${showControls || !isPlaying ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-2'
              }`}
          >
            {/* Progress Bar / Scrubber (Red Seek Bar) */}
            <div className="w-full flex items-center gap-2 group/scrub">
              <div className="relative w-full flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="video-seek-slider w-full h-1.5 sm:h-2 rounded-lg appearance-none cursor-pointer hover:h-2.5 transition-all"
                  style={{
                    background: `linear-gradient(to right, #dc2626 ${(currentTime / (duration || 1)) * 100}%, rgba(51, 65, 85, 0.8) ${(currentTime / (duration || 1)) * 100}%)`,
                    accentColor: '#dc2626'
                  }}
                  title="Seek timeline"
                />
              </div>
            </div>

            {/* Bottom Row Controls: Play/Pause, Replay, Volume, Time, Fullscreen */}
            <div className="flex items-center justify-between text-white text-xs sm:text-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1.5 text-white hover:text-red-400 transition-colors focus:outline-none cursor-pointer"
                  title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={(e) => handleSkip(-10, e)}
                  className="p-1.5 text-white hover:text-red-400 transition-colors hidden sm:inline-flex focus:outline-none cursor-pointer"
                  title="Skip 10s backward"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Volume Mute & Slider (All White Volume Slider & Icons) */}
                <div className="flex items-center gap-1.5 group/vol">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1.5 text-white hover:text-white/80 transition-colors focus:outline-none cursor-pointer"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5 text-white" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-5 h-5 text-white" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white" />
                    )}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolume}
                    className="volume-slider w-14 sm:w-20 h-1 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #ffffff ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.35) ${(isMuted ? 0 : volume) * 100}%)`,
                      accentColor: '#ffffff'
                    }}
                    title="Volume"
                  />
                </div>

                <div className="text-[11px] sm:text-xs font-medium text-slate-300 ml-1 select-none">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="text-slate-400">{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 text-white hover:text-red-400 transition-colors focus:outline-none cursor-pointer"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const History = () => {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const { user, loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [history, setHistory] = useState(() => (user?.uid ? storageService.getHistory(user.uid) : []));
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const API_BASE = getApiBaseUrl();

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await loginWithGoogle();
      if (showToast) {
        showToast({
          type: 'success',
          title: '✓ Signed in with Google',
          message: 'Your download history will now sync automatically.'
        });
      }
    } catch (err) {
      if (err?.code === 'auth/popup-closed-by-user') return;
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Sign In Failed',
          message: err?.message || 'Unable to sign in with Google.'
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const getCleanTitle = (item) => {
    if (!item) return 'Instagram Video';
    const rawUrl = item.sourceUrl || item.url || '';
    const match = rawUrl.match(/\/(reel|p|tv)\/([^\/?#]+)/i);
    let shortcode = match ? match[2] : null;

    if (!shortcode && item.thumbnailUrl) {
      const thumbMatch = item.thumbnailUrl.match(/\/thumbnail\/([^\/.]+)\.jpg/i);
      if (thumbMatch && thumbMatch[1] !== 'latest') shortcode = thumbMatch[1];
    }

    if (shortcode) {
      return `Instagram Video (${shortcode})`;
    }

    if (item.title && !item.title.includes('http://') && !item.title.includes('https://') && !item.title.includes('fbcdn.net')) {
      return item.title;
    }

    return 'Instagram Video';
  };

  const resolveThumbnailUrl = (item) => {
    if (!item) return '';
    const rawThumb = item.thumbnailUrl;
    const rawUrl = item.sourceUrl || item.url || '';
    const match = rawUrl.match(/\/(reel|p|tv)\/([^\/?#]+)/i);
    let shortcode = match ? match[2] : null;

    if (!shortcode && rawThumb) {
      const thumbMatch = rawThumb.match(/\/thumbnail\/([^\/.]+)\.jpg/i);
      if (thumbMatch) shortcode = thumbMatch[1];
    }

    if (shortcode) {
      return `${API_BASE}/api/video/thumbnail/${shortcode}.jpg`;
    }

    if (rawThumb && rawThumb.startsWith('/')) {
      return `${API_BASE}${rawThumb}`;
    }

    if (rawThumb && rawThumb.startsWith('http') && !rawThumb.includes('cdninstagram.com')) {
      return rawThumb;
    }

    if (rawUrl) {
      return `${API_BASE}/api/video/thumbnail?url=${encodeURIComponent(rawUrl)}`;
    }

    return `${API_BASE}/api/video/thumbnail/latest.jpg`;
  };

  const refreshHistory = async () => {
    // Guest Mode (No Login): NEVER display or fetch download history
    if (!user?.uid) {
      setHistory([]);
      return;
    }

    // 1. Instantly display user's cached history for their unique UID
    const local = storageService.getHistory(user.uid);
    if (Array.isArray(local) && local.length > 0) {
      setHistory(local);
    }

    // 2. Fetch authenticated user's cloud history from Firebase Firestore
    try {
      const cloudItems = await firestoreHistoryService.getUserHistory(user.uid);
      if (Array.isArray(cloudItems)) {
        setHistory(cloudItems);
        storageService.saveAllHistory(cloudItems, user.uid);
      }
    } catch (err) {
      console.error('Error fetching history from Firestore:', err);
    }
  };

  useEffect(() => {
    refreshHistory();
  }, [user]);

  const handleDeleteItem = async (id, e) => {
    if (e) {
      e.stopPropagation();
    }
    if (!user?.uid) return;
    const updated = storageService.deleteHistoryItem(id, user.uid);
    setHistory(updated);
    try {
      await firestoreHistoryService.deleteHistoryItem(user.uid, id);
    } catch (err) { }
    if (routeId && String(routeId) === String(id)) {
      navigate('/history');
    }
  };

  const handleClearAll = async () => {
    if (!user?.uid) return;
    storageService.clearHistory(user.uid);
    setHistory([]);
    setClearModalOpen(false);
    try {
      await firestoreHistoryService.clearUserHistory(user.uid);
    } catch (err) { }
  };

  // Navigates to the separate History Details page without opening Dashboard
  const handleSelectHistoryItem = (item) => {
    navigate(`/history/${item.id}`);
  };

  const getShortenedUrl = (url) => {
    if (!url) return '';
    if (url.length <= 40) return url;
    return `${url.slice(0, 38)}...`;
  };

  const handleCopyUrl = (text) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      if (showToast) {
        showToast({
          type: 'success',
          title: '✓ Copied!',
          message: 'Video URL copied to clipboard.'
        });
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      if (showToast) {
        showToast({
          type: 'success',
          title: '✓ Copied!',
          message: 'Video URL copied to clipboard.'
        });
      }
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Open Button on History Details Page -> Navigates to Dashboard and loads video
  const handleOpenInDashboard = (item) => {
    const cleanTitle = getCleanTitle(item);
    const thumbUrl = resolveThumbnailUrl(item);
    const rawUrl = item.sourceUrl || item.url || '';

    let streamUrl = rawUrl;
    if (rawUrl.startsWith('/') && !rawUrl.startsWith('/api')) {
      streamUrl = `${API_BASE}${rawUrl}`;
    } else if (rawUrl.includes('/api/video/stream?url=')) {
      streamUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE}${rawUrl}`;
    } else if (rawUrl) {
      streamUrl = `${API_BASE}/api/video/stream?url=${encodeURIComponent(rawUrl)}`;
    }

    const videoPayload = {
      sourceUrl: rawUrl,
      title: cleanTitle,
      thumbnailUrl: thumbUrl,
      streamUrl: streamUrl,
      mediaUrl: streamUrl,
      url: streamUrl,
      isVideo: true,
      mediaType: 'video',
      canPreview: true,
      contentType: 'video/mp4',
      autoPlay: false // Requirement C.4: Do not automatically play unless requested
    };

    // Save to sessionStorage for page refresh resilience on Dashboard
    try {
      sessionStorage.setItem('active_player_video', JSON.stringify(videoPayload));
    } catch (e) { }

    // Navigate to Dashboard with the selected video data
    navigate('/home', { state: { previewVideo: videoPayload, autoPlay: false } });
  };

  // --- RENDER 1: SEPARATE HISTORY DETAILS VIEW ---
  if (routeId) {
    const selectedItem = history.find(item => String(item.id) === String(routeId)) ||
      storageService.getHistory(user?.id).find(item => String(item.id) === String(routeId));

    if (!selectedItem) {
      return (
        <div className="max-w-4xl mx-auto py-6 sm:py-10 px-3 sm:px-6 space-y-4">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="p-2 -ml-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer focus:outline-none select-none flex items-center justify-center"
              title="Back to History"
              aria-label="Back to History"
            >
              <X className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
            </button>
          </div>

          <div className="rounded-3xl glass-panel p-8 sm:p-12 text-center space-y-3 shadow-2xl">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
            <h2 className="text-lg sm:text-xl font-bold theme-text-primary">History Item Not Found</h2>
            <p className="text-xs sm:text-sm theme-text-secondary max-w-sm mx-auto">
              This video record may have been cleared or removed.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="btn-primary text-xs px-5 py-2.5 rounded-xl cursor-pointer"
              >
                Return to History List
              </button>
            </div>
          </div>
        </div>
      );
    }

    const cleanTitle = getCleanTitle(selectedItem);
    const thumbUrl = resolveThumbnailUrl(selectedItem);
    const rawUrl = selectedItem.sourceUrl || selectedItem.url || '';

    let streamUrl = rawUrl;
    if (rawUrl.startsWith('/') && !rawUrl.startsWith('/api')) {
      streamUrl = `${API_BASE}${rawUrl}`;
    } else if (rawUrl.includes('/api/video/stream?url=')) {
      streamUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE}${rawUrl}`;
    } else if (rawUrl) {
      streamUrl = `${API_BASE}/api/video/stream?url=${encodeURIComponent(rawUrl)}`;
    }

    return (
      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-3 sm:px-6 space-y-4 animate-in fade-in duration-200">

        {/* Top-Left Close ❌ Navigation Button */}
        <div className="flex items-center ">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="p-2 -ml-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer focus:outline-none select-none flex items-center justify-center"
            title="Back to History"
            aria-label="Back to History"
          >
            <X className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
          </button>
        </div>

        {/* Compact Video URL & Copy Button Section */}
        {rawUrl && (
          <div className="rounded-2xl glass-panel p-3 sm:p-4 border border-slate-700/60 shadow-lg flex items-center justify-between gap-3">
            {/* Left: Heading & Shortened URL */}
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold theme-text-secondary uppercase tracking-wider block">
                Video URL :
              </span>
              <span
                className="font-mono text-xs sm:text-sm text-white font-medium block truncate mt-0.5 select-all"
                title={rawUrl}
              >
                {getShortenedUrl(rawUrl)}
              </span>
            </div>

            {/* Right: Copy Button */}
            <button
              type="button"
              onClick={() => handleCopyUrl(rawUrl)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-xs font-semibold theme-text-primary transition-all cursor-pointer shadow-sm shrink-0 text-green-400  bg-green-500/10 hover:bg-green-500/20"
              title="Copy complete original URL"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-brand-400 text-green-400  bg-green-500/10 hover:bg-green-500/20" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Video Preview Player */}
        <div className="w-full">
          <DetailsVideoPlayer
            item={selectedItem}
            cleanTitle={cleanTitle}
            thumbUrl={thumbUrl}
            streamUrl={streamUrl}
          />
        </div>

        {/* Open Button Below the Video -> Navigates to Dashboard */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => handleOpenInDashboard(selectedItem)}
            className="btn-primary w-full py-3.5 sm:py-4 px-6 rounded-2xl text-sm sm:text-base font-bold shadow-xl shadow-brand-600/30 flex items-center justify-center gap-2 sm:gap-2.5 transition-all cursor-pointer active:scale-[0.99]"
            title="Open and load this video into Dashboard player"
          >
            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <span>Open in Dashboard</span>
          </button>
        </div>

      </div>
    );
  }

  // --- RENDER 2: MAIN HISTORY LIST VIEW ---
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
                Private cloud history for <strong className="theme-text-primary">{user.userName || user.email}</strong>
              </span>
            ) : (
              <span></span>
            )}
          </p>
        </div>

        {user && history.length > 0 && (
          <button
            type="button"
            onClick={() => setClearModalOpen(true)}
            className="text-[11px] sm:text-xs text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl flex items-center gap-1.5 sm:gap-2 transition-colors font-medium whitespace-nowrap shrink-0 mt-0.5 sm:mt-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" /> Clear All History
          </button>
        )}
      </div>

      {!user ? (
        <div className="w-full max-w-lg mx-auto py-8 px-5 sm:py-10 sm:px-8 rounded-3xl glass-panel shadow-2xl flex flex-col items-center justify-center text-center space-y-4 border border-slate-700/60 my-4 animate-in fade-in duration-300">



          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 gap-1">
            <MapPin className="w-7 h-7 text-brand-400 stroke-[2.2]" />
            <div className="w-6 h-[3px] bg-red-600 rounded-full" />
          </div>



          <div className="space-y-1.5 max-w-sm">
            <h3 className="text-lg sm:text-xl font-bold theme-text-primary">
              Guest Mode (No History Saved)
            </h3>
            <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
              You’re using Video Downloader as a guest. Your downloads and searches are never saved.
            </p>
            <p className="text-xs sm:text-sm text-slate-400 pt-1">
              Sign in with Google to save your download history and access it across all your devices.
            </p>
          </div>

          <div className="pt-2 w-full max-w-xs">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-xl hover:shadow-2xl transition-all cursor-pointer active:scale-95 border border-blue-400/30"
            >
              <User className="w-4 h-4 text-white" />
              <span>{isSigningIn ? 'Logging in...' : 'Login'}</span>
            </button>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="w-[calc(100%-32px)] max-w-sm sm:max-w-md mx-auto py-5 px-4 sm:py-6 sm:px-6 rounded-2xl glass-panel shadow-lg flex flex-col items-center justify-center text-center space-y-2.5 my-1 box-border">

          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 gap-1">
            <MapPin className="w-7 h-7 text-brand-400 stroke-[2.2]" />
            <div className="w-6 h-[3px] bg-red-600 rounded-full" />
          </div>
          <div className="space-y-0.5 w-full">
            <h3 className="text-base sm:text-lg font-bold theme-text-primary">No Download History</h3>
            <p className="text-xs sm:text-xs theme-text-secondary max-w-xs mx-auto">
              Videos downloaded while signed in will be securely saved here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:gap-4">
          {history.map((item) => {
            const displayTitle = getCleanTitle(item);
            const resolvedThumb = resolveThumbnailUrl(item);

            return (
              <div
                key={item.id}
                onClick={() => handleSelectHistoryItem(item)}
                className="rounded-2xl glass-panel p-3 sm:p-5 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 transition-all duration-200 hover:border-brand-500/40 cursor-pointer group"
                title="Click to view video details"
              >
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto overflow-hidden">
                  {/* Actual Video Thumbnail */}
                  <div
                    className="w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden relative shrink-0 bg-slate-900 border border-slate-700/60 shadow-md group-hover:border-brand-500/50 transition-all"
                  >
                    {resolvedThumb ? (
                      <img
                        src={resolvedThumb}
                        alt={displayTitle}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          const m = (item.sourceUrl || item.url || '').match(/\/(reel|p|tv)\/([^\/?#]+)/i);
                          const sc = m ? m[2] : null;
                          const fallbackUrl = sc
                            ? `${API_BASE}/api/video/thumbnail/${sc}.jpg?url=${encodeURIComponent(item.sourceUrl || '')}`
                            : `${API_BASE}/api/video/thumbnail?url=${encodeURIComponent(item.sourceUrl || '')}`;

                          if (e.currentTarget.src !== fallbackUrl) {
                            e.currentTarget.src = fallbackUrl;
                          } else {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextSibling) {
                              e.currentTarget.nextSibling.style.display = 'flex';
                            }
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full flex items-center justify-center text-brand-400 bg-slate-900"
                      style={{ display: resolvedThumb ? 'none' : 'flex' }}
                    >
                      <Film className="w-5 h-5 sm:w-6 sm:h-6 text-brand-400" />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="overflow-hidden flex-1 min-w-0">
                    <h4
                      className="font-semibold theme-text-primary text-xs sm:text-base truncate max-w-full sm:max-w-md group-hover:text-brand-400 transition-colors"
                      title={displayTitle}
                    >
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

                {/* Action Buttons: View Details & Delete */}
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                  <div className="flex sm:hidden items-center">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Status: {item.status || 'Completed'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectHistoryItem(item);
                      }}
                      className="text-[11px] sm:text-xs text-green-400 border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl flex items-center gap-1 sm:gap-1.5 transition-colors font-semibold cursor-pointer"
                      title="View video details"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-3.5 h-3.5 text-green-400" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="p-1.5 sm:p-2 rounded-xl text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
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
              This action cannot be undone. All saved download history items will be deleted.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setClearModalOpen(false)}
              className="btn-secondary text-xs px-4 py-2 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="btn-danger text-xs px-4 py-2 cursor-pointer"
            >
              Clear History
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
