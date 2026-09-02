import React, { useState, useEffect, useRef } from 'react';
import { Download, Film } from 'lucide-react';

export const VideoPreviewCard = ({ video, onDownload, downloading }) => {
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  if (!video) return null;

  const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5005';
  const rawStream = video.streamUrl || video.sourceUrl;
  const mediaSource = rawStream && rawStream.startsWith('/') ? `${API_BASE}${rawStream}` : rawStream;

  // Force reset error state and trigger media reload whenever video/mediaSource updates
  useEffect(() => {
    setVideoError(false);
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.load();
      } catch (e) {
        // ignore load interruptions
      }
    }
  }, [mediaSource, video?.sourceUrl, video?.streamUrl]);

  return (
    <div 
      key={mediaSource || video?.sourceUrl || video?.title}
      className="w-full max-w-3xl mx-auto mt-8 rounded-3xl glass-panel p-5 sm:p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4"
    >
      {/* Video Title & Domain Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="font-bold text-sm sm:text-base theme-text-primary truncate max-w-[80%]">
          {video.title || 'Instagram Video'}
        </h3>
        {video.sourceDomain && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 font-medium">
            {video.sourceDomain}
          </span>
        )}
      </div>

      {/* 100% Native HTML5 Video Player Container */}
      <div className="w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/50 shadow-inner flex items-center justify-center relative min-h-[220px]">
        {videoError ? (
          <div className="p-6 text-center space-y-2 theme-text-secondary">
            <Film className="w-10 h-10 mx-auto text-brand-400 opacity-80" />
            <p className="font-semibold text-sm theme-text-primary">
              {video.title || 'Instagram Video'}
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
            autoPlay={false}
            playsInline
            preload="metadata"
            poster={video.thumbnailUrl && !video.thumbnailUrl.includes('unsplash.com') ? video.thumbnailUrl : undefined}
            onError={() => {
              setVideoError(true);
            }}
            className="w-full max-h-[520px] rounded-2xl bg-black object-contain shadow-md"
          >
            <source src={mediaSource} type="video/mp4" />
            Your browser does not support native HTML5 video playback.
          </video>
        )}
      </div>

      {/* Primary Full-Width Download Button */}
      <button
        onClick={onDownload}
        disabled={downloading}
        className="btn-primary w-full text-base sm:text-lg font-semibold py-4 rounded-xl shadow-xl shadow-brand-600/30 flex items-center justify-center gap-2.5 transition-all duration-200"
      >
        <Download className="w-5 h-5" />
        <span>{downloading ? 'Downloading Video...' : '⬇ Download Video'}</span>
      </button>

    </div>
  );
};
