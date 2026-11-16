import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const THUMBNAILS_DIR = path.resolve(__dirname, '../../public/thumbnails');

if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

export const thumbnailService = {
  getThumbnailDirectory: () => THUMBNAILS_DIR,

  getThumbnailFilePath: (shortcode) => {
    if (!shortcode) return null;
    if (shortcode === 'latest' || shortcode === 'latest.jpg') {
      const latest = thumbnailService.findMatchingThumbnail();
      if (latest) {
        return path.join(THUMBNAILS_DIR, `${latest}.jpg`);
      }
    }
    const safeShortcode = shortcode.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(THUMBNAILS_DIR, `${safeShortcode}.jpg`);
  },

  findMatchingThumbnail: (item = {}) => {
    try {
      if (!fs.existsSync(THUMBNAILS_DIR)) return null;
      const files = fs.readdirSync(THUMBNAILS_DIR).filter(f => f.endsWith('.jpg') && !f.includes('tmp'));
      if (files.length === 0) return null;

      // 1. URL pattern matching: check if any reel shortcode is present
      const rawUrl = item.sourceUrl || item.url || '';
      const urlMatch = rawUrl.match(/\/(reel|p|tv)\/([^\/?#]+)/i);
      if (urlMatch && files.includes(`${urlMatch[2]}.jpg`)) {
        return urlMatch[2];
      }

      for (const file of files) {
        const sc = file.replace(/\.jpg$/i, '');
        if (sc && (rawUrl.includes(sc) || (item.title && item.title.includes(sc)))) {
          return sc;
        }
      }

      // 2. Timestamp match: find the thumbnail file modified closest to item.createdAt / item.downloadedAt
      const itemTime = item.createdAt 
        ? new Date(item.createdAt).getTime() 
        : (item.downloadedAt ? new Date(item.downloadedAt).getTime() : 0);

      if (itemTime > 0) {
        let bestDiff = Infinity;
        let bestShortcode = null;
        for (const file of files) {
          const filePath = path.join(THUMBNAILS_DIR, file);
          const stat = fs.statSync(filePath);
          if (stat.size > 500) {
            const diff = Math.abs(stat.mtimeMs - itemTime);
            if (diff < 30 * 60 * 1000 && diff < bestDiff) {
              bestDiff = diff;
              bestShortcode = file.replace(/\.jpg$/i, '');
            }
          }
        }
        if (bestShortcode) {
          return bestShortcode;
        }
      }

      // 3. Fallback: return the most recently created/modified thumbnail
      let newestTime = 0;
      let newestShortcode = null;
      for (const file of files) {
        const filePath = path.join(THUMBNAILS_DIR, file);
        const stat = fs.statSync(filePath);
        if (stat.size > 500 && stat.mtimeMs > newestTime) {
          newestTime = stat.mtimeMs;
          newestShortcode = file.replace(/\.jpg$/i, '');
        }
      }
      return newestShortcode;
    } catch (e) {
      return null;
    }
  },

  hasThumbnail: (shortcode) => {
    const filePath = thumbnailService.getThumbnailFilePath(shortcode);
    return filePath && fs.existsSync(filePath) && fs.statSync(filePath).size > 500;
  },

  saveThumbnailFromUrl: async (shortcode, remoteUrl) => {
    if (!shortcode || !remoteUrl) return null;
    const destPath = thumbnailService.getThumbnailFilePath(shortcode);

    if (thumbnailService.hasThumbnail(shortcode)) {
      return destPath;
    }

    return new Promise((resolve) => {
      try {
        const client = remoteUrl.startsWith('https:') ? https : http;
        const req = client.get(remoteUrl, {
          family: 4,
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Referer': 'https://www.instagram.com/'
          }
        }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, remoteUrl).href;
            return thumbnailService.saveThumbnailFromUrl(shortcode, redirectUrl).then(resolve);
          }

          if (res.statusCode !== 200) {
            logger.warn('[THUMBNAIL] Failed to fetch remote thumbnail', { shortcode, statusCode: res.statusCode });
            return resolve(null);
          }

          const tempPath = `${destPath}.tmp.${Date.now()}`;
          const fileStream = fs.createWriteStream(tempPath);
          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(() => {
              try {
                if (fs.existsSync(tempPath) && fs.statSync(tempPath).size > 500) {
                  fs.renameSync(tempPath, destPath);
                  logger.info('[THUMBNAIL] Successfully saved thumbnail locally', { shortcode, size: fs.statSync(destPath).size });
                  resolve(destPath);
                } else {
                  if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                  resolve(null);
                }
              } catch (e) {
                if (fs.existsSync(tempPath)) try { fs.unlinkSync(tempPath); } catch (err) {}
                resolve(null);
              }
            });
          });

          fileStream.on('error', () => {
            if (fs.existsSync(tempPath)) try { fs.unlinkSync(tempPath); } catch (err) {}
            resolve(null);
          });
        });

        req.on('error', (err) => {
          logger.warn('[THUMBNAIL] Request error saving thumbnail', { shortcode, error: err.message });
          resolve(null);
        });

        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
      } catch (err) {
        logger.error('[THUMBNAIL] Exception in saveThumbnailFromUrl', { error: err.message });
        resolve(null);
      }
    });
  },

  extractThumbnailFromVideo: async (shortcode, videoUrlOrPath) => {
    if (!shortcode || !videoUrlOrPath) return null;
    const destPath = thumbnailService.getThumbnailFilePath(shortcode);

    if (thumbnailService.hasThumbnail(shortcode)) {
      return destPath;
    }

    return new Promise((resolve) => {
      const cmd = `"${ffmpegPath}" -y -ss 00:00:01 -i "${videoUrlOrPath}" -vframes 1 -q:v 2 "${destPath}"`;
      exec(cmd, { timeout: 15000 }, (err) => {
        if (!err && fs.existsSync(destPath) && fs.statSync(destPath).size > 500) {
          logger.info('[THUMBNAIL] Extracted thumbnail frame via ffmpeg', { shortcode });
          resolve(destPath);
        } else {
          resolve(null);
        }
      });
    });
  }
};

