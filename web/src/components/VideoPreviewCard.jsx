import React, { useState, useEffect, useRef } from 'react';
import { Download, Film } from 'lucide-react';
import { getApiBaseUrl } from '../services/api';

export const VideoPreviewCard = ({ video, onDownload, downloading }) => {
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  if (!video) return null;

  const API_BASE = getApiBaseUrl();
  const rawStream = video.streamUrl || video.sourceUrl;
  const mediaSource = rawStream && rawStream.startsWith('/') ? `${API_BASE}${rawStream}` : rawStream;

  // Force reset error state and ensure unmuted audio & volume initialization
  useEffect(() => {
    setVideoError(false);
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
      <div className="w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/50 shadow-inner flex items-center justify-center relative min-h-[220px]">
        {videoError ? (
          <div className="p-6 text-center space-y-2 theme-text-secondary">
            <Film className="w-10 h-10 mx-auto text-brand-400 opacity-80" />
            <p className="font-semibold text-sm theme-text-primary">
              Video Preview
            </p>
            <p className="text-xs theme-text-muted max-w-md mx-auto">
              Inline video preview is not available for this stream. Click the button below to download the video file directly.
            </p>
          </div>
        ) : (
          <video
            ref={videoRef}
            key={mediaSource}
            src={mediaSource}
            controls
            controlsList="nodownload"
            autoPlay={false}
            muted={false}
            playsInline
            preload="metadata"
            poster={video.thumbnailUrl && !video.thumbnailUrl.includes('unsplash.com') ? video.thumbnailUrl : undefined}
            onPlay={() => {
              if (videoRef.current) {
                videoRef.current.muted = false;
                videoRef.current.volume = 1.0;
              }
            }}
            onError={() => {
              setVideoError(true);
            }}
            className="w-full max-h-[520px] rounded-2xl bg-black object-contain shadow-md"
          >
            Your browser does not support native HTML5 video playback.
          </video>
        )}
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
