import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './src/config/db.js';
import { downloadService } from './src/services/downloadService.js';
import { thumbnailService } from './src/services/thumbnailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cacheAllThumbnails() {
  console.log('--- Starting Thumbnail Caching for All History Items ---');
  try {
    const items = await prisma.downloadHistory.findMany({
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${items.length} history items to check.`);

    for (const item of items) {
      const match = (item.sourceUrl || item.normalizedUrl || '').match(/\/(reel|p|tv)\/([^\/?#]+)/i);
      const shortcode = match ? match[2] : null;

      if (!shortcode) {
        // Direct media URL item (e.g. image)
        const idShortcode = item.id.replace(/-/g, '').slice(0, 16);
        if (thumbnailService.hasThumbnail(idShortcode)) {
          console.log(`Item ${item.id} already has cached thumbnail.`);
        } else if (item.sourceUrl && (item.sourceUrl.includes('.jpg') || item.sourceUrl.includes('.png') || item.sourceUrl.includes('.webp'))) {
          console.log(`Fetching direct image thumbnail for ${item.id}...`);
          await thumbnailService.saveThumbnailFromUrl(idShortcode, item.sourceUrl);
        }
        continue;
      }

      if (thumbnailService.hasThumbnail(shortcode)) {
        console.log(`Shortcode ${shortcode} already cached locally.`);
        continue;
      }

      console.log(`Extracting and caching thumbnail for ${shortcode}...`);
      try {
        const meta = await downloadService.getVideoMetadata(`https://www.instagram.com/reel/${shortcode}/`);
        if (meta && meta.thumbnailUrl) {
          await thumbnailService.saveThumbnailFromUrl(shortcode, meta.thumbnailUrl);
          console.log(`✓ Cached thumbnail for ${shortcode}`);
        } else {
          console.warn(`✗ No thumbnail found for ${shortcode}`);
        }
      } catch (err) {
        console.warn(`! Error extracting for ${shortcode}:`, err.message);
      }
    }

    console.log('--- Finished Caching Thumbnails ---');
  } catch (err) {
    console.error('Fatal error in cacheAllThumbnails:', err);
  } finally {
    process.exit(0);
  }
}

cacheAllThumbnails();

