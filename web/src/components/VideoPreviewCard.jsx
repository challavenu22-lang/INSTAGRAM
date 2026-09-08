import React, { useState, useEffect, useRef } from 'react';
import { Download, Film, Loader2, RotateCw } from 'lucide-react';
import { getApiBaseUrl } from '../services/api';

export const VideoPreviewCard = ({ video, onDownload, downloading }) => {
  const [videoError, setVideoError] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const videoRef = useRef(null);

  if (!video) return null;

  const API_BASE = getApiBaseUrl();
  const rawStream = video.streamUrl || video.sourceUrl;
  const mediaSource = rawStream && rawStream.startsWith('/') ? `${API_BASE}${rawStream}` : rawStream;

  // Reset states and ensure unmuted audio & volume initialization
  useEffect(() => {
    setVideoError(false);
    setMediaLoading(true);
    setRetryCount(0);
    const videoEl = videoRef.current;
    if (videoEl) {
      try {
        videoEl.muted = false;
        videoEl.volume = 1.0;
        videoEl.pause();
        videoEl.load();
      } catch (e) {
        // ignore load interruptions
      }

      const unMuteAudio = () => {
        videoEl.muted = false;
        videoEl.volume = 1.0;
      };

      videoEl.addEventListener('play', unMuteAudio);
      videoEl.addEventListener('playing', unMuteAudio);
      videoEl.addEventListener('pointerdown', unMuteAudio);
      videoEl.addEventListener('touchstart', unMuteAudio);

      return () => {
        videoEl.removeEventListener('play', unMuteAudio);
        videoEl.removeEventListener('playing', unMuteAudio);
        videoEl.removeEventListener('pointerdown', unMuteAudio);
        videoEl.removeEventListener('touchstart', unMuteAudio);
      };
    }
  }, [mediaSource, video?.sourceUrl, video?.streamUrl]);

  const handleRetryStream = () => {
    setVideoError(false);
    setMediaLoading(true);
    setRetryCount(prev => prev + 1);
    if (videoRef.current) {
      try {
        videoRef.current.load();
      } catch (e) {}
    }
  };

  return (
    <div 
      key={mediaSource || video?.sourceUrl || video?.title}
      className="w-full max-w-3xl mx-auto mt-8 rounded-3xl glass-panel p-5 sm:p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4"
    >
      <style>{`
        video::-webkit-media-controls-overlay-play-button,
        video::-webkit-media-controls-start-playback-button,
        video::-webkit-media-controls-play-button-overlay,
        video::-internal-media-controls-overlay-play-button {
          display: none !important;
          -webkit-appearance: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
          width: 0 !important;
          height: 0 !important;
          margin: 0 !important;
        }
      `}</style>

      {/* 100% Native HTML5 Video Player Container */}
      <div className="w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/50 shadow-inner flex items-center justify-center relative min-h-[260px]">
        {/* Centered Loading Spinner overlay during video load */}
        {mediaLoading && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] z-10 pointer-events-none transition-opacity duration-300">
            <div className="flex flex-col items-center justify-center space-y-2.5 p-4 rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-2xl">
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
              <span className="text-xs font-semibold text-slate-200 tracking-wide">Loading video stream...</span>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          key={mediaSource}
          src={mediaSource}
          controls
          controlsList="nodownload"
          autoPlay={false}
          muted={false}
          playsInline
          referrerPolicy="no-referrer"
          preload="metadata"
          onLoadStart={() => setMediaLoading(true)}
          onWaiting={() => setMediaLoading(true)}
          onCanPlay={() => setMediaLoading(false)}
          onLoadedData={() => setMediaLoading(false)}
          onPlaying={() => setMediaLoading(false)}
          onPlay={() => {
            if (videoRef.current) {
              videoRef.current.muted = false;
              videoRef.current.volume = 1.0;
            }
          }}
          onError={() => {
            setMediaLoading(false);
            setVideoError(true);
          }}
          className="w-full max-h-[520px] rounded-2xl bg-black object-contain shadow-md"
        >
          Your browser does not support native HTML5 video playback.
        </video>
      </div>

      {/* Primary Full-Width Download Button */}
      <button
        onClick={() => onDownload(false)}
        disabled={downloading}
        className="btn-primary w-full text-base sm:text-lg font-semibold py-4 rounded-xl shadow-xl shadow-brand-600/30 flex items-center justify-center gap-2.5 transition-all duration-200"
      >
        <Download className="w-5 h-5" />
        <span>{downloading ? 'Downloading Video...' : '⬇ Download Video'}</span>
      </button>
    </div>
  );
};
