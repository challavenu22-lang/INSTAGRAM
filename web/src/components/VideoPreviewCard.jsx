import React, { useState, useEffect, useRef } from 'react';
import { Download, Film, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { getApiBaseUrl } from '../services/api';

const CarouselItem = ({ item, totalCount, index, videoTitle, onDownload, downloading, downloadingIndex }) => {
  const API_BASE = getApiBaseUrl();
  const isVideo = item.isVideo === true || item.mediaType === 'video' || (item.contentType && item.contentType.startsWith('video/'));
  
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

  const currentPoster = item.thumbnailUrl || item.thumbnail;
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
  const videoRef = useRef(null);

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
  const isSingleVideo = singleItem.isVideo === true || 
                        singleItem.mediaType === 'video' ||
                        (singleItem.contentType && singleItem.contentType.startsWith('video/')) ||
                        (video.mediaType === 'video' && singleItem.isVideo !== false && singleItem.mediaType !== 'image');

  const getMediaUrl = (item) => {
    const raw = item.mediaUrl || item.streamUrl || video.mediaUrl || video.streamUrl || item.url || item.sourceUrl || video.sourceUrl;
    if (!raw) return '';
    return raw.startsWith('/') ? `${API_BASE}${raw}` : raw;
  };

  const initialSource = getMediaUrl(singleItem);
  const [mediaSource, setMediaSource] = useState(initialSource);

  useEffect(() => {
    setVideoError(false);
    setImageError(false);
    setMediaLoading(true);
    setMediaSource(getMediaUrl(singleItem));

    const videoEl = videoRef.current;
    if (videoEl && isSingleVideo) {
      try {
        videoEl.muted = false;
        videoEl.volume = 1.0;
        videoEl.pause();
        videoEl.load();
      } catch (e) {}

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
  }, [video, isSingleVideo]);

  const currentPoster = singleItem.thumbnailUrl || singleItem.thumbnail || video?.thumbnailUrl || video?.thumbnail;

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
      {/* Media Display Area */}
      <div className="w-full rounded-2xl overflow-hidden bg-slate-950/80 border border-slate-700/50 shadow-inner flex items-center justify-center relative min-h-[280px]">
        {/* Loading Spinner */}
        {mediaLoading && !videoError && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-[2px] z-10 pointer-events-none transition-opacity duration-300">
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
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-sm font-medium text-slate-300">Unable to load this video stream. Please try again.</p>
            </div>
          ) : (
            <video
              ref={videoRef}
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
              onLoadStart={() => setMediaLoading(true)}
              onWaiting={() => setMediaLoading(true)}
              onCanPlay={() => setMediaLoading(false)}
              onLoadedData={() => setMediaLoading(false)}
              onLoadedMetadata={() => setMediaLoading(false)}
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
              className="w-full max-h-[560px] rounded-2xl bg-black object-contain shadow-md"
            >
              Your browser does not support native HTML5 video playback.
            </video>
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
                alt={video.title || "Instagram Image Preview"}
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
