import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Film, 
  Loader2, 
  AlertCircle, 
  Image as ImageIcon,
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw
} from 'lucide-react';
import { getApiBaseUrl } from '../services/api';

const CarouselItem = ({ item, totalCount, index, videoTitle, onDownload, downloading, downloadingIndex }) => {
  const API_BASE = getApiBaseUrl();
  const rawTarget = item.sourceUrl || item.url || item.mediaUrl || '';
  const isVideo = item.isVideo === true || 
                  item.mediaType === 'video' || 
                  (item.contentType && item.contentType.startsWith('video/')) ||
                  /\.(mp4|webm|m4v|mov)(\?|$)/i.test(rawTarget) ||
                  /\/(reel|tv)\//i.test(rawTarget);
  
  const initialUrl = item.mediaUrl || item.streamUrl || item.url;
  const fullUrl = initialUrl?.startsWith('/') ? `${API_BASE}${initialUrl}` : initialUrl;

  const [mediaSource, setMediaSource] = useState(fullUrl);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    setMediaLoading(true);
    setMediaError(false);
    const src = item.mediaUrl || item.streamUrl || item.url;
    setMediaSource(src?.startsWith('/') ? `${API_BASE}${src}` : src);
  }, [item]);

  const resolveItemPoster = () => {
    const raw = item.thumbnailUrl || item.thumbnail;
    const match = rawTarget.match(/\/(reel|p|tv)\/([^\/?#]+)/i);
    const shortcode = match ? match[2] : null;

    if (raw && raw.startsWith('/')) {
      return `${API_BASE}${raw}`;
    }
    if (shortcode) {
      return `${API_BASE}/api/video/thumbnail/${shortcode}.jpg`;
    }
    if (raw && raw.startsWith('http') && !raw.includes('cdninstagram.com')) {
      return raw;
    }
    if (rawTarget) {
      return `${API_BASE}/api/video/thumbnail?url=${encodeURIComponent(rawTarget)}`;
    }
    return '';
  };

  const currentPoster = resolveItemPoster();
  const isThisDownloading = downloading && downloadingIndex === index;

  return (
    <div 
      key={item.sourceUrl || item.url || index}
      className="w-full rounded-2xl overflow-hidden bg-slate-950/80 border border-slate-700/50 p-4 sm:p-5 shadow-xl flex flex-col items-center justify-center relative space-y-4"
    >
      {/* Media Item Counter Header */}
      <div className="w-full flex items-center justify-between px-2 py-1 text-xs sm:text-sm font-semibold theme-text-secondary border-b border-slate-800/60 pb-2">
        <div className="flex items-center gap-2">
          {isVideo ? (
            <Film className="w-4 h-4 text-brand-400" />
          ) : (
            <ImageIcon className="w-4 h-4 text-indigo-400" />
          )}
          <span>
            {isVideo ? `Video ${index + 1} of ${totalCount}` : `Image ${index + 1} of ${totalCount}`}
          </span>
        </div>
      </div>

      {/* Media Display Area */}
      <div className="w-full flex items-center justify-center p-2 sm:p-4 bg-slate-950/40 rounded-xl relative overflow-hidden min-h-[220px]">
        {mediaLoading && !mediaError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-[2px] z-10 pointer-events-none transition-opacity duration-300">
            <div className="flex flex-col items-center justify-center space-y-2 p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-2xl">
              <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
              <span className="text-xs font-semibold text-slate-200 tracking-wide">
                {isVideo ? 'Loading video...' : 'Loading image...'}
              </span>
            </div>
          </div>
        )}

        {mediaError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <p className="text-xs sm:text-sm font-medium text-slate-300">
              {isVideo ? 'Unable to load this video.' : 'Unable to load this image.'}
            </p>
          </div>
        ) : isVideo ? (
          <video
            key={mediaSource}
            src={mediaSource}
            poster={currentPoster}
            controls
            controlsList="nodownload"
            autoPlay={false}
            muted={false}
            playsInline
            referrerPolicy="no-referrer"
            preload="metadata"
            onCanPlay={() => setMediaLoading(false)}
            onLoadedData={() => setMediaLoading(false)}
            onError={() => {
              setMediaLoading(false);
              setMediaError(true);
            }}
            className="w-full max-h-[520px] rounded-xl bg-black object-contain shadow-md"
          >
            <source src={mediaSource} type="video/mp4" />
            Your browser does not support native HTML5 video playback.
          </video>
        ) : (
          <img
            key={mediaSource}
            src={mediaSource}
            alt={`${videoTitle || 'Instagram Media'} ${index + 1}`}
            referrerPolicy="no-referrer"
            onLoad={() => setMediaLoading(false)}
            onError={(e) => {
              console.error(`Image ${index + 1} load error:`, mediaSource, e);
              const rawTargetUrl = item.sourceUrl || item.url;
              const proxiedUrl = `${API_BASE}/api/video/stream?url=${encodeURIComponent(rawTargetUrl || mediaSource)}`;
              if (mediaSource !== proxiedUrl) {
                setMediaSource(proxiedUrl);
              } else {
                setMediaLoading(false);
                setMediaError(true);
              }
            }}
            className="max-w-full max-h-[520px] w-auto h-auto rounded-xl object-contain mx-auto shadow-lg transition-all duration-200"
            style={{
              objectFit: 'contain',
              objectPosition: 'center',
              maxWidth: '100%',
              maxHeight: '520px',
              width: 'auto',
              height: 'auto'
            }}
          />
        )}
      </div>

      {/* Dedicated Download Button for this Item */}
      <button
        onClick={() => onDownload(item.url || item.sourceUrl || item.mediaUrl, index)}
        disabled={downloading}
        className="btn-primary w-full text-sm sm:text-base font-semibold py-3 rounded-xl shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 transition-all duration-200"
      >
        <Download className="w-4 h-4" />
        <span>
          {isThisDownloading
            ? (isVideo ? `Downloading Video ${index + 1}...` : `Downloading Image ${index + 1}...`)
            : (isVideo ? `⬇ Download Video ${index + 1}` : `⬇ Download Image ${index + 1}`)
          }
        </span>
      </button>
    </div>
  );
};

export const VideoPreviewCard = ({ video, onDownload, downloading }) => {
  const [videoError, setVideoError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [downloadingIndex, setDownloadingIndex] = useState(null);

  // Custom Video Player States
  const [isPlaying, setIsPlaying] = useState(Boolean(video?.autoPlay));
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  if (!video) return null;

  const rawItems = video.mediaItems || video.items;
  const items = Array.isArray(rawItems) && rawItems.length > 0 ? rawItems : [video];
  const isCarousel = items.length > 1 || video.mediaType === 'carousel';

  const API_BASE = getApiBaseUrl();

  const handleItemDownload = (targetUrl, index) => {
    setDownloadingIndex(index);
    onDownload(targetUrl, index);
  };

  useEffect(() => {
    if (!downloading) {
      setDownloadingIndex(null);
    }
  }, [downloading]);

  const singleItem = items[0] || video;
  const targetCheckUrl = singleItem.sourceUrl || video.sourceUrl || singleItem.url || video.url || '';

  // Robust video detection: if it's an Instagram reel, tv, mp4, or flagged as video, treat as video
  const isSingleVideo = 
    singleItem.isVideo === true || 
    video.isVideo === true ||
    singleItem.mediaType === 'video' ||
    video.mediaType === 'video' ||
    (singleItem.contentType && singleItem.contentType.startsWith('video/')) ||
    (video.contentType && video.contentType.startsWith('video/')) ||
    /\/(reel|tv)\//i.test(targetCheckUrl) ||
    /\.(mp4|webm|m4v|mov)(\?|$)/i.test(targetCheckUrl);

  const getMediaUrl = (item) => {
    const raw = item.mediaUrl || item.streamUrl || video.mediaUrl || video.streamUrl || item.url || item.sourceUrl || video.sourceUrl;
    if (!raw) return '';
    return raw.startsWith('/') ? `${API_BASE}${raw}` : raw;
  };

  const initialSource = getMediaUrl(singleItem);
  const [mediaSource, setMediaSource] = useState(initialSource);

  // Fullscreen change listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  // Cleanup on unmount: stop video, reset source, clear buffer
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        } catch (e) {}
      }
    };
  }, []);

  // Sync media source and handle autoplay
  useEffect(() => {
    setVideoError(false);
    setImageError(false);
    setMediaLoading(true);
    const newSrc = getMediaUrl(singleItem);
    setMediaSource(newSrc);

    const videoEl = videoRef.current;
    if (videoEl && isSingleVideo) {
      // If autoPlay is requested (e.g. opened from History)
      if (video?.autoPlay) {
        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setMediaLoading(false);
            })
            .catch(() => {
              // Browser policy restricted unmuted autoplay: mute and start
              videoEl.muted = true;
              setIsMuted(true);
              videoEl.play()
                .then(() => {
                  setIsPlaying(true);
                  setMediaLoading(false);
                })
                .catch(() => {
                  setIsPlaying(false);
                  setMediaLoading(false);
                });
            });
        }
      }
    }
  }, [video, isSingleVideo]);

  // Activity handler to auto-hide controls after 3.5s of inactivity while playing
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  const togglePlay = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (videoEl.paused) {
      videoEl.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          videoEl.muted = true;
          setIsMuted(true);
          videoEl.play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        });
    } else {
      videoEl.pause();
      setIsPlaying(false);
    }
    handleUserActivity();
  };

  const toggleMute = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isMuted || videoEl.muted) {
      videoEl.muted = false;
      setIsMuted(false);
      if (volume === 0) {
        setVolume(1);
        videoEl.volume = 1;
      }
    } else {
      videoEl.muted = true;
      setIsMuted(true);
    }
    handleUserActivity();
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.volume = newVol;
      if (newVol === 0) {
        videoEl.muted = true;
        setIsMuted(true);
      } else if (isMuted) {
        videoEl.muted = false;
        setIsMuted(false);
      }
    }
    handleUserActivity();
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.currentTime = seekTime;
    }
    handleUserActivity();
  };

  const handleSkip = (seconds, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.currentTime = Math.min(Math.max(0, videoEl.currentTime + seconds), duration || Infinity);
    }
    handleUserActivity();
  };

  const toggleFullscreen = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const container = playerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
    handleUserActivity();
  };

  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds || isNaN(timeInSeconds)) return '0:00';
    const totalSecs = Math.floor(timeInSeconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const resolvePoster = () => {
    let raw = singleItem.thumbnailUrl || singleItem.thumbnail || video?.thumbnailUrl || video?.thumbnail;
    const match = targetCheckUrl.match(/\/(reel|p|tv)\/([^\/?#]+)/i);
    const shortcode = match ? match[2] : null;

    if (raw && raw.startsWith('/')) {
      return `${API_BASE}${raw}`;
    }
    if (shortcode) {
      return `${API_BASE}/api/video/thumbnail/${shortcode}.jpg`;
    }
    if (raw && raw.startsWith('http') && !raw.includes('cdninstagram.com')) {
      return raw;
    }
    if (targetCheckUrl) {
      return `${API_BASE}/api/video/thumbnail?url=${encodeURIComponent(targetCheckUrl)}`;
    }
    return '';
  };

  const currentPoster = resolvePoster();

  // Clean video title: Never display raw URLs in title above Dashboard video player
  const getDisplayTitle = () => {
    return isSingleVideo ? 'Instagram Video' : 'Instagram Image';
  };

  const displayTitle = getDisplayTitle();

  // Render Carousel Mode: All items displayed vertically one below another
  if (isCarousel) {
    return (
      <div 
        key={video?.sourceUrl || video?.title || 'carousel-card'}
        className="w-full max-w-3xl mx-auto mt-8 rounded-3xl glass-panel p-5 sm:p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6"
      >
        <div className="flex items-center justify-between px-1 text-sm font-bold theme-text-primary border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-brand-400" />
            <span>Instagram Carousel ({items.length} items)</span>
          </div>
        </div>

        <div className="flex flex-col space-y-6">
          {items.map((item, idx) => (
            <CarouselItem
              key={item.sourceUrl || item.url || idx}
              item={item}
              totalCount={items.length}
              index={idx}
              videoTitle={video.title}
              onDownload={handleItemDownload}
              downloading={downloading}
              downloadingIndex={downloadingIndex}
            />
          ))}
        </div>
      </div>
    );
  }

  // Render Single Media Mode: Video or Image
  return (
    <div 
      key={video?.sourceUrl || video?.streamUrl || video?.title || 'single-card'}
      className="w-full max-w-3xl mx-auto mt-8 rounded-3xl glass-panel p-5 sm:p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4"
    >
      {/* Media Display Area with Custom Video Player */}
      <div 
        ref={playerContainerRef}
        onMouseMove={handleUserActivity}
        onMouseEnter={() => setShowControls(true)}
        onTouchStart={handleUserActivity}
        className="w-full rounded-2xl overflow-hidden bg-black border border-slate-700/50 shadow-2xl flex items-center justify-center relative min-h-[300px] sm:min-h-[380px] group select-none"
      >
        {/* Loading Spinner Overlay */}
        {mediaLoading && !videoError && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] z-30 pointer-events-none transition-opacity duration-300">
            <div className="flex flex-col items-center justify-center space-y-2.5 p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl">
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
              <span className="text-xs font-semibold text-slate-200 tracking-wide">
                {isSingleVideo ? 'Loading video stream...' : 'Loading image preview...'}
              </span>
            </div>
          </div>
        )}

        {isSingleVideo ? (
          videoError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 z-20">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-sm font-medium text-slate-300">Unable to load this video. The media stream may be unavailable or expired.</p>
              <button
                type="button"
                onClick={() => {
                  setVideoError(false);
                  setMediaLoading(true);
                  if (videoRef.current) {
                    videoRef.current.load();
                    videoRef.current.play().catch(() => {});
                  }
                }}
                className="btn-secondary text-xs px-4 py-2 mt-2 cursor-pointer"
              >
                Retry Playback
              </button>
            </div>
          ) : (
            <>
              {/* Native HTML5 Video Element */}
              <video
                ref={videoRef}
                key={mediaSource}
                src={mediaSource}
                poster={currentPoster}
                autoPlay={Boolean(video?.autoPlay)}
                muted={isMuted}
                playsInline
                preload="metadata"
                onClick={togglePlay}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration);
                    setMediaLoading(false);
                  }
                }}
                onDurationChange={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration);
                  }
                }}
                onPlay={() => {
                  setIsPlaying(true);
                  setMediaLoading(false);
                }}
                onPause={() => setIsPlaying(false)}
                onWaiting={() => setMediaLoading(true)}
                onPlaying={() => setMediaLoading(false)}
                onCanPlay={() => setMediaLoading(false)}
                onError={() => {
                  setMediaLoading(false);
                  setVideoError(true);
                }}
                className="w-full max-h-[580px] bg-black object-contain cursor-pointer"
              >
                <source src={mediaSource} type="video/mp4" />
                Your browser does not support native HTML5 video playback.
              </video>

              {/* Big Center Play Overlay Button when paused (Clean White Triangle without red circle) */}
              {!isPlaying && !mediaLoading && !videoError && (
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
                className={`absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 sm:p-4 pt-8 flex flex-col gap-2 transition-all duration-300 ${
                  showControls || !isPlaying ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-2'
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

                {/* Bottom Row: Play/Pause, Volume, Time, Fullscreen */}
                <div className="flex items-center justify-between text-white text-xs sm:text-sm">
                  {/* Left Controls: Play/Pause, Replay, Volume, Time */}
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
                        onChange={handleVolumeChange}
                        className="volume-slider w-14 sm:w-20 h-1 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #ffffff ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.35) ${(isMuted ? 0 : volume) * 100}%)`,
                          accentColor: '#ffffff'
                        }}
                        title="Volume"
                      />
                    </div>

                    {/* Current Time / Duration */}
                    <div className="text-[11px] sm:text-xs font-medium text-slate-300 ml-1 select-none">
                      <span>{formatTime(currentTime)}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-slate-400">{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Right Controls: Fullscreen */}
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
          )
        ) : (
          <div className="w-full flex items-center justify-center p-2 sm:p-4 bg-slate-950/40 rounded-2xl relative overflow-hidden min-h-[280px]">
            {imageError ? (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-400" />
                <p className="text-sm font-medium text-slate-300">Unable to load this image. Please try again.</p>
              </div>
            ) : (
              <img
                key={mediaSource}
                src={mediaSource}
                alt={displayTitle || "Instagram Image Preview"}
                referrerPolicy="no-referrer"
                onLoad={() => setMediaLoading(false)}
                onError={(e) => {
                  console.error("Image preview load error for URL:", mediaSource, e);
                  const rawTargetUrl = singleItem.sourceUrl || video.sourceUrl || video.directMediaUrl;
                  const proxiedUrl = `${API_BASE}/api/video/stream?url=${encodeURIComponent(rawTargetUrl || mediaSource)}`;
                  
                  if (mediaSource !== proxiedUrl) {
                    setMediaSource(proxiedUrl);
                  } else {
                    setMediaLoading(false);
                    setImageError(true);
                  }
                }}
                className="max-w-full max-h-[520px] w-auto h-auto rounded-xl object-contain mx-auto shadow-lg transition-all duration-200"
                style={{
                  objectFit: 'contain',
                  objectPosition: 'center',
                  maxWidth: '100%',
                  maxHeight: '520px',
                  width: 'auto',
                  height: 'auto'
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Primary Download Button */}
      <button
        onClick={() => onDownload(false)}
        disabled={downloading}
        className="btn-primary w-full text-base sm:text-lg font-semibold py-4 rounded-xl shadow-xl shadow-brand-600/30 flex items-center justify-center gap-2.5 transition-all duration-200"
      >
        <Download className="w-5 h-5" />
        <span>
          {downloading 
            ? (isSingleVideo ? 'Downloading Video...' : 'Downloading Image...') 
            : (isSingleVideo ? '⬇ Download Video' : '⬇ Download Image')
          }
        </span>
      </button>
    </div>
  );
};
