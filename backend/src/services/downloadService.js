import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { instagramGetUrl } from 'instagram-url-direct';
import { extractWithPuppeteer } from './puppeteerScraper.js';
import { validateVideoUrl } from '../utils/urlValidator.js';
import { sanitizeFilename } from '../utils/filenameSanitizer.js';
import { MAX_FILE_SIZE_BYTES } from '../config/constants.js';
import prisma from '../config/db.js';
import { logger } from '../utils/logger.js';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });


const mediaStreamCache = new Map();
const thumbnailCache = new Map();
const mediaInfoCache = new Map();

function getCachedMediaUrl(shortcode) {
  const cached = mediaStreamCache.get(shortcode);
  if (cached && cached.expiry > Date.now()) {
    return cached.url;
  }
  return null;
}

function setCachedMediaUrl(shortcode, url) {
  if (shortcode && url) {
    mediaStreamCache.set(shortcode, {
      url,
      expiry: Date.now() + 10 * 60 * 1000
    });
  }
}

function getCachedMediaInfo(shortcode) {
  const cached = mediaInfoCache.get(shortcode);
  if (cached && cached.expiry > Date.now()) {
    return cached.info;
  }
  return null;
}

function setCachedMediaInfo(shortcode, info) {
  if (shortcode && info && info.mediaType !== 'unknown') {
    mediaInfoCache.set(shortcode, {
      info,
      expiry: Date.now() + 10 * 60 * 1000
    });
  }
}

function getCachedThumbnailUrl(shortcode) {
  const cached = thumbnailCache.get(shortcode);
  if (cached && cached.expiry > Date.now()) {
    return cached.url;
  }
  return null;
}

function setCachedThumbnailUrl(shortcode, url) {
  if (shortcode && url) {
    thumbnailCache.set(shortcode, {
      url,
      expiry: Date.now() + 10 * 60 * 1000
    });
  }
}

function isImageUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const lower = urlStr.toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|bmp)(\?|$)/i.test(lower)) return true;
  if (lower.includes('format=jpg') || lower.includes('format=png') || lower.includes('mime=image')) return true;
  return false;
}

function isVideoUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const lower = urlStr.toLowerCase();
  if (urlStr.startsWith('/tmp/') || urlStr.includes('merged_') || urlStr.includes('vid_')) return true;
  if (/\.(mp4|m4v|webm|mov)(\?|$)/i.test(lower)) return true;
  if (lower.includes('_n.mp4') || lower.includes('_v.mp4') || lower.includes('progressive') || lower.includes('video_dashinit') || lower.includes('mime=video') || lower.includes('/o1/v/')) return true;
  return false;
}

export const downloadService = {
  getVideoMetadata: async (rawUrl) => {
    const validation = validateVideoUrl(rawUrl);
    if (!validation.valid) {
      throw { status: 400, message: validation.reason };
    }

    const targetUrl = validation.url;
    const hostname = validation.hostname;
    const urlObj = new URL(targetUrl);

    if (targetUrl.includes('sample.mp4')) {
      return {
        sourceUrl: targetUrl,
        sourceDomain: 'localhost',
        title: 'Local Test Video (flower.mp4)',
        thumbnailUrl: null,
        streamUrl: '/public/sample.mp4',
        videoType: 'direct',
        contentType: 'video/mp4',
        fileSizeBytes: 1127000,
        canPreview: true,
        isVideo: true,
        mediaType: 'video'
      };
    }

    let title = 'Authorized Media Stream';
    let thumbnailUrl = null;
    let videoType = 'direct';
    let streamUrl = `/api/video/stream?url=${encodeURIComponent(targetUrl)}`;

    if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) {
      const match = urlObj.pathname.match(/\/(reel|p|tv)\/([^\/]+)/);
      const shortcode = match ? match[2] : null;
      if (!shortcode) {
        throw {
          status: 400,
          message: 'Invalid Instagram URL format. Please enter a valid Instagram reel or post link.'
        };
      }

      videoType = 'instagram';
      const mediaInfo = await downloadService.extractDirectMediaInfo(targetUrl);

      if (!mediaInfo.url && mediaInfo.mediaType === 'unknown') {
        throw {
          status: 400,
          message: 'Unable to retrieve media from this Instagram URL. Please verify that the post or reel is public.'
        };
      }

      const isVid = mediaInfo.isVideo !== false && mediaInfo.mediaType === 'video';
      const isCarousel = mediaInfo.mediaType === 'carousel' || (mediaInfo.items && mediaInfo.items.length > 1);

      title = isCarousel 
        ? `Instagram Carousel (${shortcode})`
        : (isVid ? `Instagram Video (${shortcode})` : `Instagram Image (${shortcode})`);
      thumbnailUrl = mediaInfo.thumbnailUrl || mediaInfo.url || getCachedThumbnailUrl(shortcode) || null;

      if (mediaInfo.url && mediaInfo.url.startsWith('/')) {
        streamUrl = mediaInfo.url;
      } else {
        streamUrl = `/api/video/stream?url=${encodeURIComponent(targetUrl)}`;
      }

      const mediaUrl = streamUrl;
      const downloadUrl = `/api/video/download`;

      const itemsList = mediaInfo.items ? mediaInfo.items.map((item, idx) => {
        const itemIsVid = item.isVideo === true || item.mediaType === 'video';
        const streamPath = `/api/video/stream?url=${encodeURIComponent(item.url || targetUrl)}`;
        return {
          index: idx + 1,
          type: itemIsVid ? 'video' : 'image',
          mediaType: itemIsVid ? 'video' : 'image',
          isVideo: itemIsVid,
          url: item.url,
          mediaUrl: streamPath,
          streamUrl: streamPath,
          downloadUrl: `/api/video/download`,
          sourceUrl: item.url || targetUrl,
          thumbnailUrl: itemIsVid ? item.thumbnailUrl : item.url
        };
      }) : null;

      return {
        sourceUrl: targetUrl,
        sourceDomain: hostname,
        title,
        thumbnailUrl,
        streamUrl,
        mediaUrl,
        downloadUrl,
        directMediaUrl: mediaInfo.url,
        videoType,
        contentType: mediaInfo.contentType || (isVid ? 'video/mp4' : 'image/jpeg'),
        fileSizeBytes: null,
        canPreview: true,
        isVideo: isVid,
        mediaType: isCarousel ? 'carousel' : (isVid ? 'video' : 'image'),
        mediaItems: itemsList,
        items: itemsList
      };
    } else {
      const pathname = urlObj.pathname;
      const isImg = isImageUrl(pathname);
      const rawFileName = pathname.substring(pathname.lastIndexOf('/') + 1) || (isImg ? 'image.jpg' : 'video.mp4');
      title = decodeURIComponent(rawFileName).replace(/[_-]/g, ' ') || (isImg ? 'Direct Image Stream' : 'Direct Video Stream');
      const mediaUrl = `/api/video/stream?url=${encodeURIComponent(targetUrl)}`;
      const downloadUrl = `/api/video/download`;

      return {
        sourceUrl: targetUrl,
        sourceDomain: hostname,
        title,
        thumbnailUrl: isImg ? targetUrl : null,
        streamUrl: targetUrl,
        mediaUrl,
        downloadUrl,
        videoType: 'direct',
        contentType: isImg ? 'image/jpeg' : 'video/mp4',
        fileSizeBytes: null,
        canPreview: true,
        isVideo: !isImg,
        mediaType: isImg ? 'image' : 'video'
      };
    }
  },

  downloadVideo: async (rawUrl, userId, res) => {
    const validation = validateVideoUrl(rawUrl);
    if (!validation.valid) {
      throw { status: 400, message: validation.reason };
    }

    const targetUrl = validation.url;
    const hostname = validation.hostname;
    const urlObj = new URL(targetUrl);

    let streamMediaUrl = targetUrl;
    let isImageMedia = isImageUrl(targetUrl);

    const isPostPage = urlObj.pathname.match(/\/(reel|p|tv)\/([^\/]+)/);

    if (isPostPage && (hostname.includes('instagram.com') || hostname.includes('instagr.am'))) {
      const mediaInfo = await downloadService.extractDirectMediaInfo(targetUrl);
      if (!mediaInfo.url && mediaInfo.mediaType === 'unknown') {
        throw {
          status: 400,
          message: 'Unable to retrieve media stream. Please verify that the Instagram post or reel is public.'
        };
      }
      if (mediaInfo.url) {
        streamMediaUrl = mediaInfo.url;
      }
      isImageMedia = mediaInfo.mediaType === 'image' || (mediaInfo.isVideo === false && !isVideoUrl(streamMediaUrl));
    }

    if (streamMediaUrl.startsWith('/tmp/') || fs.existsSync(streamMediaUrl)) {
      const stat = fs.statSync(streamMediaUrl);
      const ext = isImageMedia ? '.jpg' : '.mp4';
      const cleanFilename = sanitizeFilename(hostname + (isImageMedia ? '_image' : '_video') + ext);
      res.setHeader('Content-Type', isImageMedia ? 'image/jpeg' : 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
      res.setHeader('Content-Length', stat.size);
      fs.createReadStream(streamMediaUrl).pipe(res);
      if (userId) {
        try {
          const match = targetUrl.match(/\/(reel|p|tv)\/([^\/]+)/);
          const shortcode = match ? match[2] : null;
          const cachedThumb = shortcode ? getCachedThumbnailUrl(shortcode) : null;
          const { historyService } = await import('./historyService.js');
          await historyService.createHistoryItem(userId, {
            sourceUrl: targetUrl,
            sourceDomain: hostname,
            title: isImageMedia ? `Instagram Image (${targetUrl})` : `Instagram Video (${targetUrl})`,
            thumbnailUrl: cachedThumb || null,
            status: 'COMPLETED',
            fileSize: stat.size
          });
        } catch (e) {}
      }
      return;
    }

    return new Promise((resolve, reject) => {
      const client = streamMediaUrl.startsWith('https:') ? https : http;

      const req = client.get(streamMediaUrl, { 
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*'
        }
      }, async (remoteRes) => {
        if (remoteRes.statusCode >= 300 && remoteRes.statusCode < 400 && remoteRes.headers.location) {
          const redirectUrl = new URL(remoteRes.headers.location, streamMediaUrl).href;
          return downloadService.downloadVideo(redirectUrl, userId, res).then(resolve).catch(reject);
        }

        const contentType = remoteRes.headers['content-type'] || '';

        if (contentType.includes('text/html')) {
          return reject({ status: 400, message: 'Unable to retrieve media stream. Please verify that the Instagram post or reel is public.' });
        }

        if (remoteRes.statusCode !== 200 && remoteRes.statusCode !== 206) {
          return reject({ status: 400, message: 'Unable to retrieve media stream. Please verify that the Instagram post or reel is public.' });
        }

        const contentLength = parseInt(remoteRes.headers['content-length'] || '0', 10);
        if (contentLength > MAX_FILE_SIZE_BYTES) {
          return reject({ status: 413, message: 'Requested media exceeds maximum allowed size limit (500 MB).' });
        }

        const isImg = isImageMedia || contentType.includes('image/');
        const ext = isImg ? '.jpg' : '.mp4';
        const cleanFilename = sanitizeFilename(hostname + (isImg ? '_image' : '_video') + ext);

        res.setHeader('Content-Type', contentType || (isImg ? 'image/jpeg' : 'video/mp4'));
        res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
        if (contentLength > 0) {
          res.setHeader('Content-Length', contentLength);
        }

        remoteRes.pipe(res);

        remoteRes.on('end', async () => {
          logger.info('Media download completed successfully', { userId });
          if (userId) {
            try {
              const match = targetUrl.match(/\/(reel|p|tv)\/([^\/]+)/);
              const shortcode = match ? match[2] : null;
              const cachedThumb = shortcode ? getCachedThumbnailUrl(shortcode) : null;
              const { historyService } = await import('./historyService.js');
              await historyService.createHistoryItem(userId, {
                sourceUrl: targetUrl,
                sourceDomain: hostname,
                title: isImg ? `Instagram Image (${targetUrl})` : `Instagram Video (${targetUrl})`,
                thumbnailUrl: cachedThumb || null,
                status: 'COMPLETED',
                fileSize: contentLength > 0 ? contentLength : null
              });
            } catch (e) {
              logger.warn('Failed to auto-create backend download history', { error: e.message });
            }
          }
          resolve();
        });

        remoteRes.on('error', async (err) => {
          logger.error('Stream error during download', { error: err.message });
          reject({ status: 500, message: 'Media stream interrupted during download.' });
        });
      });

      req.on('error', async (err) => {
        logger.error('Connection error requesting media URL', { error: err.message });
        reject({ status: 502, message: 'Could not connect to media server. Please check the URL.' });
      });

      req.on('timeout', () => {
        req.destroy();
        reject({ status: 504, message: 'Download request timed out.' });
      });
    });
  },

  cleanMediaUrl: (raw) => {
    if (!raw) return null;
    let cleaned = raw
      .split('/u003C')[0]
      .split('<')[0]
      .split('"')[0]
      .split("'")[0]
      .replace(/\\u0026/g, '&')
      .replace(/&amp;/g, '&')
      .replace(/\\u00253D/gi, '=')
      .replace(/\\u0025/g, '%')
      .replace(/\\\/|\\/g, '/')
      .replace(/([^:]\/)\/+/g, '$1');

    if (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }

    return cleaned;
  },

  extractDirectMediaInfo: async (targetUrl) => {
    try {
      const urlObj = new URL(targetUrl);
      const match = urlObj.pathname.match(/\/(reel|p|tv)\/([^\/]+)/);
      if (!match) {
        return {
          url: null,
          isVideo: false,
          mediaType: 'unknown',
          contentType: null,
          thumbnailUrl: null
        };
      }
      const shortcode = match[2];

      const cachedInfo = getCachedMediaInfo(shortcode);
      if (cachedInfo) {
        return cachedInfo;
      }

      const cachedUrl = getCachedMediaUrl(shortcode);
      if (cachedUrl) {
        if (isVideoUrl(cachedUrl)) {
          return {
            url: cachedUrl,
            isVideo: true,
            mediaType: 'video',
            contentType: 'video/mp4',
            thumbnailUrl: getCachedThumbnailUrl(shortcode) || null
          };
        } else if (isImageUrl(cachedUrl)) {
          return {
            url: cachedUrl,
            isVideo: false,
            mediaType: 'image',
            contentType: 'image/jpeg',
            thumbnailUrl: cachedUrl
          };
        }
      }

      // Method 0: RapidAPI Integration (if API key is present)
      if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_KEY.trim()) {
        try {
          const rapidResult = await new Promise((resolve) => {
            const req = https.request({
              hostname: process.env.RAPIDAPI_HOST || 'instagram-scraper-stable-api.p.rapidapi.com',
              path: '/get_media_data.php',
              method: 'POST',
              headers: {
                'x-rapidapi-key': process.env.RAPIDAPI_KEY,
                'x-rapidapi-host': process.env.RAPIDAPI_HOST || 'instagram-scraper-stable-api.p.rapidapi.com',
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              timeout: 10000
            }, (res) => {
              let body = '';
              res.on('data', chunk => body += chunk);
              res.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  if (res.statusCode === 200 && data) {
                    return resolve(data);
                  } else {
                    logger.warn('RapidAPI response info', { status: res.statusCode, message: data.message });
                  }
                } catch (e) {}
                resolve(null);
              });
            });
            req.on('error', () => resolve(null));
            req.write(`username_or_url=${encodeURIComponent(targetUrl)}&data=posts`);
            req.end();
          });

          if (rapidResult) {
            const videoLink = rapidResult.video_url || rapidResult.video_versions?.[0]?.url;
            const isVid = rapidResult.is_video === true || rapidResult.media_type === 2 || Boolean(videoLink);
            const rawThumb = rapidResult.display_url || rapidResult.display_resources?.[rapidResult.display_resources.length - 1]?.src || rapidResult.image_versions2?.candidates?.[0]?.url || rapidResult.thumbnail_url;
            const thumb = rawThumb ? downloadService.cleanMediaUrl(rawThumb) : null;

            if (thumb) {
              setCachedThumbnailUrl(shortcode, thumb);
            }

            if (videoLink && isVid) {
              setCachedMediaUrl(shortcode, videoLink);
              return {
                url: videoLink,
                isVideo: true,
                mediaType: 'video',
                contentType: 'video/mp4',
                thumbnailUrl: thumb || null
              };
            } else if (thumb) {
              setCachedMediaUrl(shortcode, thumb);
              return {
                url: thumb,
                isVideo: false,
                mediaType: 'image',
                contentType: 'image/jpeg',
                thumbnailUrl: thumb
              };
            }
          }
        } catch (e) {
          logger.warn('RapidAPI extraction exception', { error: e.message });
        }
      }

      // Method 1: Try instagram-url-direct package
      try {
        const instaRes = await instagramGetUrl(targetUrl);
        if (instaRes) {
          const mediaType = instaRes.type || (instaRes.media_has_video ? 'video' : null);
          const urlsList = instaRes.url_list || [];

          if (urlsList.length > 0) {
            const items = urlsList.map(u => {
              const isVid = isVideoUrl(u);
              return {
                url: u,
                isVideo: isVid,
                mediaType: isVid ? 'video' : 'image',
                contentType: isVid ? 'video/mp4' : 'image/jpeg'
              };
            });

            const hasVideo = items.some(i => i.isVideo);
            const selectedItem = (mediaType === 'video' || hasVideo) 
              ? (items.find(i => i.isVideo) || items[0])
              : items[0];

            setCachedMediaUrl(shortcode, selectedItem.url);

            return {
              url: selectedItem.url,
              isVideo: selectedItem.isVideo,
              mediaType: selectedItem.mediaType,
              contentType: selectedItem.contentType,
              thumbnailUrl: getCachedThumbnailUrl(shortcode) || (selectedItem.isVideo ? null : selectedItem.url),
              items: items.length > 1 ? items : null
            };
          }
        }
      } catch (err) {
        logger.warn('instagram-url-direct extraction fallback', { error: err.message });
      }

      // Method 2: HTML Scraping via httpGetBot
      const httpGetBot = (urlStr, depth = 0) => {
        if (depth > 5) return Promise.resolve('');
        return new Promise((resolve) => {
          https.get(urlStr, {
            headers: {
              'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            timeout: 10000
          }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              const redirectUrl = new URL(res.headers.location, urlStr).href;
              return httpGetBot(redirectUrl, depth + 1).then(resolve);
            }
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(body));
          }).on('error', () => resolve(''));
        });
      };

      const bodyReel = await httpGetBot(`https://www.instagram.com/reel/${shortcode}/`);
      const cleanBody = (bodyReel || '').replace(/\\\/|\\/g, '/').replace(/\\u0026/g, '&').replace(/&amp;/g, '&');

      // Find uncropped full-resolution photo URLs (avoid cropped thumbnails like stp=c... or s150x150)
      const allImgUrls = cleanBody.match(/https?:\/\/[^\s"'<>]*(?:scontent|cdninstagram|fbcdn)[^\s"'<>]*\.(?:jpg|jpeg|webp|png)[^\s"'<>]+/gi) || [];
      const uncroppedCandidate = allImgUrls.find(u => 
        !u.includes('stp=c') && 
        !u.includes('_s150x150') && 
        !u.includes('_s320x320') && 
        !u.includes('_s640x640') && 
        !u.includes('profile_pic')
      );

      const displayUrlMatch = cleanBody.match(/"display_url"\s*:\s*"([^"]+)"/i) ||
                              cleanBody.match(/"display_resources"\s*:\s*\[\s*\{\s*"src"\s*:\s*"([^"]+)"/i);
      const ogImgMatch = cleanBody.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                         cleanBody.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

      let extractedThumbnail = uncroppedCandidate 
        ? downloadService.cleanMediaUrl(uncroppedCandidate)
        : (displayUrlMatch ? downloadService.cleanMediaUrl(displayUrlMatch[1]) : (ogImgMatch ? downloadService.cleanMediaUrl(ogImgMatch[1]) : (allImgUrls.length > 0 ? downloadService.cleanMediaUrl(allImgUrls[0]) : null)));

      if (extractedThumbnail) {
        setCachedThumbnailUrl(shortcode, extractedThumbnail);
      }

      const urls = cleanBody.match(/https?:\/\/[^\s"'<>]*(?:scontent|cdninstagram|fbcdn)[^\s"'<>]*?(?:\.mp4|\.m4a|\/o1\/v\/|\/v\/t[0-9]*\/|efg=|video_dashinit|audio_dashinit)[^\s"'<>]+/gi) || [];

      let audioUrl = null;
      let progressiveUrl = null;
      let dashVideoUrl = null;

      for (const u of urls) {
        const c = downloadService.cleanMediaUrl(u);
        if (!c) continue;
        const efgMatch = c.match(/efg=([^&]+)/);
        if (efgMatch) {
          try {
            const decoded = Buffer.from(decodeURIComponent(efgMatch[1]), 'base64').toString('utf8');
            if ((decoded.includes('audio') || c.includes('.m4a') || decoded.includes('audio_only')) && !audioUrl) {
              audioUrl = c;
            } else if ((decoded.includes('progressive') || c.includes('_n.mp4') || c.includes('_v.mp4')) && !progressiveUrl) {
              progressiveUrl = c;
            } else if ((decoded.includes('dash') || decoded.includes('clips')) && !dashVideoUrl) {
              dashVideoUrl = c;
            }
          } catch (e) {}
        } else if (c.includes('_n.mp4') || c.includes('_v.mp4') || c.includes('progressive')) {
          if (!progressiveUrl) progressiveUrl = c;
        } else if (c.includes('.m4a') || c.includes('audio')) {
          if (!audioUrl) audioUrl = c;
        }
      }

      // Priority 1: Combined Progressive Video URL
      if (progressiveUrl) {
        logger.info('[MEDIA EXTRACTION] Selected progressive audio+video URL', { shortcode, url: progressiveUrl.slice(0, 80) });
        setCachedMediaUrl(shortcode, progressiveUrl);
        return {
          url: progressiveUrl,
          isVideo: true,
          mediaType: 'video',
          contentType: 'video/mp4',
          thumbnailUrl: getCachedThumbnailUrl(shortcode) || null
        };
      }

      // Priority 2: Multiplex DASH video + DASH audio via FFmpeg
      if (dashVideoUrl && audioUrl) {
        logger.info('[AUDIO-VIDEO MULTIPLEXING START]', { shortcode, videoUrl: dashVideoUrl.slice(0, 80), audioUrl: audioUrl.slice(0, 80) });
        const tempVid = path.join('/tmp', `vid_${shortcode}.mp4`);
        const tempAud = path.join('/tmp', `aud_${shortcode}.m4a`);
        const tempOut = path.join('/tmp', `merged_${shortcode}.mp4`);

        await new Promise(r => https.get(dashVideoUrl, res => res.pipe(fs.createWriteStream(tempVid)).on('finish', r)));
        await new Promise(r => https.get(audioUrl, res => res.pipe(fs.createWriteStream(tempAud)).on('finish', r)));

        await new Promise((resolve, reject) => {
          exec(`"${ffmpegPath}" -y -i "${tempVid}" -i "${tempAud}" -c:v copy -c:a aac -movflags +faststart "${tempOut}"`, (err) => {
            try {
              if (fs.existsSync(tempVid)) fs.unlinkSync(tempVid);
              if (fs.existsSync(tempAud)) fs.unlinkSync(tempAud);
            } catch (e) {}
            if (err) return reject(err);
            resolve();
          });
        });

        logger.info('[AUDIO-VIDEO MULTIPLEXING SUCCESS]', { shortcode, mergedFilePath: tempOut });
        setCachedMediaUrl(shortcode, tempOut);
        return {
          url: tempOut,
          isVideo: true,
          mediaType: 'video',
          contentType: 'video/mp4',
          thumbnailUrl: getCachedThumbnailUrl(shortcode) || null
        };
      }

      // Priority 3: Fall back to non-DASH URL or first extracted video URL
      const fallbackUrl = urls.find(u => {
        const c = downloadService.cleanMediaUrl(u);
        return c && (c.includes('_n.mp4') || c.includes('_v.mp4') || !c.includes('dash'));
      }) || (urls.length > 0 ? downloadService.cleanMediaUrl(urls[0]) : null);

      if (fallbackUrl && isVideoUrl(fallbackUrl)) {
        setCachedMediaUrl(shortcode, fallbackUrl);
        return {
          url: fallbackUrl,
          isVideo: true,
          mediaType: 'video',
          contentType: 'video/mp4',
          thumbnailUrl: getCachedThumbnailUrl(shortcode) || null
        };
      }

      // Fallback: If no video is present, check for CAROUSEL or IMAGE
      if (extractedThumbnail || cleanBody.length > 0) {
        const cleanThumb = extractedThumbnail ? downloadService.cleanMediaUrl(extractedThumbnail) : null;
        
        // Collect carousel items from display_urls or distinct uncropped photo URLs
        const displayUrls = Array.from(cleanBody.matchAll(/"display_url"\s*:\s*"([^"]+)"/gi)).map(m => downloadService.cleanMediaUrl(m[1]));
        const carouselItems = [];

        if (displayUrls.length > 1) {
          const uniqueUrls = Array.from(new Set(displayUrls));
          uniqueUrls.forEach((u, idx) => {
            carouselItems.push({
              index: idx + 1,
              url: u,
              isVideo: false,
              mediaType: 'image',
              contentType: 'image/jpeg',
              thumbnailUrl: u
            });
          });
        }

        if (carouselItems.length === 0) {
          const uncropped = allImgUrls.filter(u => 
            !u.includes('stp=c') && 
            !u.includes('_s150x150') && 
            !u.includes('_s320x320') && 
            !u.includes('_s640x640') && 
            !u.includes('profile_pic')
          );

          const seenAssets = new Set();
          uncropped.forEach((u) => {
            const cleanU = downloadService.cleanMediaUrl(u);
            const assetMatch = cleanU.match(/\/([a-zA-Z0-9_-]+\.(?:jpg|jpeg|webp|png|mp4))/i) || cleanU.match(/\/([0-9]+_[0-9]+_[0-9]+)/);
            const assetId = assetMatch ? assetMatch[1] : cleanU.split('?')[0];
            if (!seenAssets.has(assetId)) {
              seenAssets.add(assetId);
              carouselItems.push({
                index: carouselItems.length + 1,
                url: cleanU,
                isVideo: false,
                mediaType: 'image',
                contentType: 'image/jpeg',
                thumbnailUrl: cleanU
              });
            }
          });
        }

        if (carouselItems.length > 1) {
          setCachedMediaUrl(shortcode, carouselItems[0].url);
          const resultObj = {
            url: carouselItems[0].url,
            isVideo: false,
            mediaType: 'carousel',
            contentType: 'image/jpeg',
            thumbnailUrl: carouselItems[0].url,
            items: carouselItems
          };
          setCachedMediaInfo(shortcode, resultObj);
          return resultObj;
        }

        if (cleanThumb) {
          setCachedMediaUrl(shortcode, cleanThumb);
          const resultObj = {
            url: cleanThumb,
            isVideo: false,
            mediaType: 'image',
            contentType: 'image/jpeg',
            thumbnailUrl: cleanThumb
          };
          setCachedMediaInfo(shortcode, resultObj);
          return resultObj;
        }
      }

      // Method 3: Direct Embed Page HTTP Scraper (Fast & Serverless friendly)
      try {
        const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
        const embedHtml = await new Promise((resolve) => {
          https.get(embedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            timeout: 8000
          }, (res) => {
            let b = '';
            res.on('data', chunk => b += chunk);
            res.on('end', () => resolve(b));
          }).on('error', () => resolve(''));
        });

        if (embedHtml && embedHtml.length > 500) {
          const cleanEmbed = embedHtml
            .replace(/\\u002F/gi, '/')
            .replace(/\\\/|\\/g, '/')
            .replace(/\\u0026/gi, '&')
            .replace(/&amp;/g, '&')
            .replace(/\\u0025/gi, '%');

          const videoSrcMatch = cleanEmbed.match(/<video[^>]+src=["']([^"']+)["']/i) || cleanEmbed.match(/"video_url"\s*:\s*"([^"]+)"/i);
          const imgSrcMatch = cleanEmbed.match(/<img[^>]+class="EmbeddedMediaImage"[^>]+src=["']([^"']+)["']/i) || cleanEmbed.match(/"display_url"\s*:\s*"([^"]+)"/i);

          if (videoSrcMatch && videoSrcMatch[1]) {
            const vUrl = downloadService.cleanMediaUrl(videoSrcMatch[1]);
            const tUrl = imgSrcMatch ? downloadService.cleanMediaUrl(imgSrcMatch[1]) : null;
            setCachedMediaUrl(shortcode, vUrl);
            const resObj = {
              url: vUrl,
              isVideo: true,
              mediaType: 'video',
              contentType: 'video/mp4',
              thumbnailUrl: tUrl
            };
            setCachedMediaInfo(shortcode, resObj);
            return resObj;
          }

          if (imgSrcMatch && imgSrcMatch[1]) {
            const iUrl = downloadService.cleanMediaUrl(imgSrcMatch[1]);
            if (!iUrl.includes('profile_pic') && !iUrl.includes('s100x100')) {
              setCachedMediaUrl(shortcode, iUrl);
              const resObj = {
                url: iUrl,
                isVideo: false,
                mediaType: 'image',
                contentType: 'image/jpeg',
                thumbnailUrl: iUrl
              };
              setCachedMediaInfo(shortcode, resObj);
              return resObj;
            }
          }
        }
      } catch (e) {
        logger.warn('[MEDIA EXTRACTION] Embed HTTP scraper error:', { error: e.message });
      }

      // Method 4: Puppeteer Headless Chrome Fallback
      logger.info('[MEDIA EXTRACTION] Attempting Puppeteer extraction fallback', { shortcode, targetUrl });
      const puppeteerResult = await extractWithPuppeteer(targetUrl);
      if (puppeteerResult && puppeteerResult.url) {
        setCachedMediaUrl(shortcode, puppeteerResult.url);
        if (puppeteerResult.thumbnailUrl) {
          setCachedThumbnailUrl(shortcode, puppeteerResult.thumbnailUrl);
        }
        setCachedMediaInfo(shortcode, puppeteerResult);
        return puppeteerResult;
      }

      return {
        url: null,
        isVideo: false,
        mediaType: 'unknown',
        contentType: null,
        thumbnailUrl: null
      };
    } catch (e) {
      logger.error('Error extracting direct media info', { error: e.message });
      return {
        url: null,
        isVideo: false,
        mediaType: 'unknown',
        contentType: null,
        thumbnailUrl: null
      };
    }
  },

  extractDirectMediaUrl: async (targetUrl) => {
    const info = await downloadService.extractDirectMediaInfo(targetUrl);
    return info && info.isVideo ? info.url : null;
  },

  streamVideoPlayer: async (rawUrl, res, clientHeaders = {}) => {
    const validation = validateVideoUrl(rawUrl);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.reason });
    }

    const targetUrl = validation.url;
    const hostname = validation.hostname;

    let streamMediaUrl = targetUrl;
    let isImageMedia = isImageUrl(targetUrl);

    if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) {
      const mediaInfo = await downloadService.extractDirectMediaInfo(targetUrl);
      if (mediaInfo && mediaInfo.url) {
        streamMediaUrl = mediaInfo.url;
        isImageMedia = mediaInfo.mediaType === 'image' || mediaInfo.isVideo === false;
      }
    }

    const isUnresolvedPage = typeof streamMediaUrl === 'string' && streamMediaUrl.startsWith('http') && 
      (streamMediaUrl.includes('instagram.com/reel/') || 
       streamMediaUrl.includes('instagram.com/p/') || 
       streamMediaUrl.includes('instagram.com/tv/') ||
       streamMediaUrl.includes('instagr.am/') ||
       (streamMediaUrl.includes('www.instagram.com') && !streamMediaUrl.includes('cdninstagram.com')));

    if (!streamMediaUrl || isUnresolvedPage) {
      return res.status(400).json({
        success: false,
        error: 'Unable to retrieve media stream. Please verify that the Instagram post or reel is public.'
      });
    }

    if (streamMediaUrl.startsWith('/tmp/') || fs.existsSync(streamMediaUrl)) {
      const stat = fs.statSync(streamMediaUrl);
      const fileSize = stat.size;
      const range = clientHeaders.range;

      if (isImageMedia) {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400'
        });
        return fs.createReadStream(streamMediaUrl).pipe(res);
      }

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        let start = parseInt(parts[0], 10) || 0;
        let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        if (start >= fileSize) {
          res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
          return res.end();
        }
        end = Math.min(end, fileSize - 1);
        if (start > end) start = 0;

        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(streamMediaUrl, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        });
        file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes'
        });
        fs.createReadStream(streamMediaUrl).pipe(res);
      }
      return;
    }

    return new Promise((resolve) => {
      const client = streamMediaUrl.startsWith('https:') ? https : http;
      const requestHeaders = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': isImageMedia ? 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' : 'video/webm,video/mp4,video/*;q=0.9,*/*;q=0.8',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com'
      };

      if (clientHeaders.range) {
        requestHeaders['Range'] = clientHeaders.range;
      }

      const req = client.get(streamMediaUrl, { 
        agent: streamMediaUrl.startsWith('https:') ? httpsAgent : undefined,
        timeout: 25000,
        headers: requestHeaders
      }, async (remoteRes) => {
        if (remoteRes.statusCode >= 300 && remoteRes.statusCode < 400 && remoteRes.headers.location) {
          const redirectUrl = new URL(remoteRes.headers.location, streamMediaUrl).href;
          return downloadService.streamVideoPlayer(redirectUrl, res, clientHeaders).then(resolve);
        }

        const contentType = remoteRes.headers['content-type'] || (isImageMedia ? 'image/jpeg' : 'video/mp4');

        if (contentType.includes('text/html') || (remoteRes.statusCode !== 200 && remoteRes.statusCode !== 206)) {
          logger.warn('[MEDIA STREAM FALLBACK ERROR]', {
            requestedReelUrl: rawUrl,
            resolvedMediaUrl: streamMediaUrl,
            httpStatus: remoteRes.statusCode
          });
          if (rawUrl && rawUrl.includes('sample.mp4')) {
            const samplePath = path.join(process.cwd(), 'public', 'sample.mp4');
            if (fs.existsSync(samplePath)) {
              const stat = fs.statSync(samplePath);
              res.writeHead(200, {
                'Content-Length': stat.size,
                'Content-Type': 'video/mp4',
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
              });
              return fs.createReadStream(samplePath).pipe(res);
            }
          }
          if (!res.headersSent) {
            res.status(400).json({
              success: false,
              error: 'Unable to retrieve media stream. Please verify that the Instagram post or reel is public.'
            });
          }
          return resolve();
        }

        const responseHeaders = {
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600'
        };

        if (remoteRes.headers['content-length']) {
          responseHeaders['Content-Length'] = remoteRes.headers['content-length'];
        }
        if (remoteRes.headers['content-range']) {
          responseHeaders['Content-Range'] = remoteRes.headers['content-range'];
        }

        res.writeHead(remoteRes.statusCode, responseHeaders);
        remoteRes.pipe(res);
        remoteRes.on('end', resolve);
      });

      req.on('error', (err) => {
        logger.error('Connection error requesting stream URL', { error: err.message });
        if (!res.headersSent) {
          res.status(502).json({ success: false, error: 'Could not connect to media server. Please check the URL.' });
        }
        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        if (!res.headersSent) {
          res.status(504).json({ success: false, error: 'Stream request timed out.' });
        }
        resolve();
      });
    });
  }
};




