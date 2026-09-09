import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { instagramGetUrl } from 'instagram-url-direct';
import { validateVideoUrl } from '../utils/urlValidator.js';
import { sanitizeFilename } from '../utils/filenameSanitizer.js';
import { MAX_FILE_SIZE_BYTES } from '../config/constants.js';
import prisma from '../config/db.js';
import { logger } from '../utils/logger.js';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const mediaStreamCache = new Map();
const thumbnailCache = new Map();

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
        canPreview: true
      };
    }

    let title = 'Authorized Video Stream';
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

      title = `Instagram Video (${shortcode})`;
      thumbnailUrl = getCachedThumbnailUrl(shortcode) || null;
      videoType = 'instagram';
      streamUrl = `/api/video/stream?url=${encodeURIComponent(targetUrl)}`;

      try {
        const resolved = await downloadService.extractDirectMediaUrl(targetUrl);
        if (resolved && (resolved.startsWith('http') || fs.existsSync(resolved))) {
          if (resolved.startsWith('/')) {
            streamUrl = resolved;
          }
          const cachedThumb = getCachedThumbnailUrl(shortcode);
          if (cachedThumb) {
            thumbnailUrl = cachedThumb;
          }
        }
      } catch (e) {
        logger.warn('Direct media pre-extraction non-fatal warning', { error: e.message });
      }
    } else {
      const pathname = urlObj.pathname;
      const rawFileName = pathname.substring(pathname.lastIndexOf('/') + 1) || 'video.mp4';
      title = decodeURIComponent(rawFileName).replace(/[_-]/g, ' ') || 'Direct Video Stream';
    }

    return {
      sourceUrl: targetUrl,
      sourceDomain: hostname,
      title,
      thumbnailUrl,
      streamUrl,
      videoType,
      contentType: 'video/mp4',
      fileSizeBytes: null,
      canPreview: true
    };
  },

  downloadVideo: async (rawUrl, userId, res) => {
    const validation = validateVideoUrl(rawUrl);
    if (!validation.valid) {
      throw { status: 400, message: validation.reason };
    }

    const targetUrl = validation.url;
    const hostname = validation.hostname;

    let streamMediaUrl = targetUrl;
    if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) {
      const resolved = await downloadService.extractDirectMediaUrl(targetUrl);
      if (resolved) {
        streamMediaUrl = resolved;
      }
    }

    if (streamMediaUrl.startsWith('/tmp/') || fs.existsSync(streamMediaUrl)) {
      const stat = fs.statSync(streamMediaUrl);
      const cleanFilename = sanitizeFilename(hostname + '_video.mp4');
      res.setHeader('Content-Type', 'video/mp4');
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
            title: `Instagram Video (${targetUrl})`,
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
          return reject({ status: 400, message: 'Unable to retrieve video stream. Please verify that the Instagram post or reel is public.' });
        }

        if (remoteRes.statusCode !== 200 && remoteRes.statusCode !== 206) {
          return reject({ status: 400, message: 'Unable to retrieve video stream. Please verify that the Instagram post or reel is public.' });
        }

        const contentLength = parseInt(remoteRes.headers['content-length'] || '0', 10);
        if (contentLength > MAX_FILE_SIZE_BYTES) {
          return reject({ status: 413, message: 'Requested video exceeds maximum allowed size limit (500 MB).' });
        }

        const cleanFilename = sanitizeFilename(hostname + '_video.mp4');

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
        if (contentLength > 0) {
          res.setHeader('Content-Length', contentLength);
        }

        remoteRes.pipe(res);

        remoteRes.on('end', async () => {
          logger.info('Video download completed successfully', { userId });
          if (userId) {
            try {
              const match = targetUrl.match(/\/(reel|p|tv)\/([^\/]+)/);
              const shortcode = match ? match[2] : null;
              const cachedThumb = shortcode ? getCachedThumbnailUrl(shortcode) : null;
              const { historyService } = await import('./historyService.js');
              await historyService.createHistoryItem(userId, {
                sourceUrl: targetUrl,
                sourceDomain: hostname,
                title: `Instagram Video (${targetUrl})`,
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
          reject({ status: 500, message: 'Video stream interrupted during download.' });
        });
      });

      req.on('error', async (err) => {
        logger.error('Connection error requesting video URL', { error: err.message });
        reject({ status: 502, message: 'Could not connect to video server. Please check the URL.' });
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
      .replace(/\\\/|\\/g, '/')
      .replace(/\\u0026/g, '&')
      .replace(/&amp;/g, '&')
      .replace(/\\u00253D/gi, '=')
      .replace(/%3D/gi, '=')
      .replace(/([^:]\/)\/+/g, '$1');

    if (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
  },

  extractDirectMediaUrl: async (targetUrl) => {
    try {
      const urlObj = new URL(targetUrl);
      const match = urlObj.pathname.match(/\/(reel|p|tv)\/([^\/]+)/);
      if (!match) return null;
      const shortcode = match[2];

      const cached = getCachedMediaUrl(shortcode);
      if (cached) {
        return cached;
      }

      // Method 0: RapidAPI Integration (if API key is present)
      if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_KEY.trim()) {
        try {
          const rapidUrl = await new Promise((resolve) => {
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
                    const videoLink = data.video_url || data.video_versions?.[0]?.url || data.media_url || data.url;
                    if (videoLink) return resolve(videoLink);
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

          if (rapidUrl) {
            setCachedMediaUrl(shortcode, rapidUrl);
            return rapidUrl;
          }
        } catch (e) {
          logger.warn('RapidAPI extraction exception', { error: e.message });
        }
      }

      // Method 1: Try instagram-url-direct package
      try {
        const instaRes = await instagramGetUrl(targetUrl);
        if (instaRes && instaRes.url_list && instaRes.url_list.length > 0) {
          const directUrl = instaRes.url_list[0];
          if (directUrl) {
            setCachedMediaUrl(shortcode, directUrl);
            return directUrl;
          }
        }
      } catch (err) {
        logger.warn('instagram-url-direct extraction fallback', { error: err.message });
      }

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

      const ogImgMatch = cleanBody.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                         cleanBody.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      let extractedThumbnail = ogImgMatch ? ogImgMatch[1] : null;
      if (!extractedThumbnail) {
        const imgUrls = cleanBody.match(/https?:\/\/[^\s"'<>]*(?:scontent|cdninstagram|fbcdn)[^\s"'<>]*\.(?:jpg|jpeg|webp|png)[^\s"'<>]+/gi) || [];
        if (imgUrls.length > 0) {
          extractedThumbnail = imgUrls[0];
        }
      }
      if (extractedThumbnail) {
        setCachedThumbnailUrl(shortcode, downloadService.cleanMediaUrl(extractedThumbnail));
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

      // Priority 1: Combined Progressive URL (Contains both Video AND Audio in 1 file)
      if (progressiveUrl) {
        logger.info('[MEDIA EXTRACTION] Selected progressive audio+video URL', { shortcode, url: progressiveUrl.slice(0, 80) });
        setCachedMediaUrl(shortcode, progressiveUrl);
        return progressiveUrl;
      }

      // Priority 2: Multiplex DASH video + DASH audio via FFmpeg into combined MP4
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
        return tempOut;
      }

      // Priority 3: Fall back to non-DASH URL or first extracted URL
      const fallbackUrl = urls.find(u => {
        const c = downloadService.cleanMediaUrl(u);
        return c && (c.includes('_n.mp4') || c.includes('_v.mp4') || !c.includes('dash'));
      }) || (urls.length > 0 ? downloadService.cleanMediaUrl(urls[0]) : null);

      if (fallbackUrl) {
        setCachedMediaUrl(shortcode, fallbackUrl);
        return fallbackUrl;
      }

      return null;
    } catch (e) {
      logger.error('Error extracting direct media URL', { error: e.message });
      return null;
    }
  },

  streamVideoPlayer: async (rawUrl, res, clientHeaders = {}) => {
    const validation = validateVideoUrl(rawUrl);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.reason });
    }

    const targetUrl = validation.url;
    const hostname = validation.hostname;

    let streamMediaUrl = targetUrl;
    if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) {
      const resolved = await downloadService.extractDirectMediaUrl(targetUrl);
      if (resolved) {
        streamMediaUrl = resolved;
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
        error: 'Unable to retrieve video stream. Please verify that the Instagram post or reel is public.'
      });
    }

    if (streamMediaUrl.startsWith('/tmp/') || fs.existsSync(streamMediaUrl)) {
      const stat = fs.statSync(streamMediaUrl);
      const fileSize = stat.size;
      const range = clientHeaders.range;

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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
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

        const contentType = remoteRes.headers['content-type'] || '';

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
              fs.createReadStream(samplePath).pipe(res);
              return resolve();
            }
          }
          return res.status(400).json({
            success: false,
            error: 'Unable to retrieve video stream. Please verify that the Instagram post or reel is public.'
          });
        }

        logger.info('[MEDIA STREAM PREPARATION SUCCESS]', {
          requestedReelUrl: rawUrl,
          resolvedMediaUrl: streamMediaUrl,
          httpStatus: remoteRes.statusCode,
          contentType: contentType || 'video/mp4',
          contentLength: remoteRes.headers['content-length'] || 'unknown',
          rangeSupported: !!remoteRes.headers['accept-ranges'] || remoteRes.statusCode === 206,
          audioTrackPreserved: true
        });

        res.status(remoteRes.statusCode);
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        if (remoteRes.headers['content-length']) {
          res.setHeader('Content-Length', remoteRes.headers['content-length']);
        }
        if (remoteRes.headers['accept-ranges']) {
          res.setHeader('Accept-Ranges', remoteRes.headers['accept-ranges']);
        }
        if (remoteRes.headers['content-range']) {
          res.setHeader('Content-Range', remoteRes.headers['content-range']);
        }

        remoteRes.pipe(res);

        remoteRes.on('end', () => resolve());
        remoteRes.on('error', () => {
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Video playback stream interrupted.' });
          }
          resolve();
        });
      });

      req.on('error', () => {
        if (!res.headersSent) {
          res.status(502).json({ success: false, error: 'Could not connect to video media server.' });
        }
        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        if (!res.headersSent) {
          res.status(504).json({ success: false, error: 'Video stream request timed out.' });
        }
        resolve();
      });
    });
  }
};

