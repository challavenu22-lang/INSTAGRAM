import { downloadService } from '../services/downloadService.js';
import { thumbnailService } from '../services/thumbnailService.js';

export const searchVideo = async (req, res, next) => {
  try {
    const { url } = req.body;
    const metadata = await downloadService.getVideoMetadata(url);
    res.json({
      success: true,
      data: metadata
    });
  } catch (error) {
    next(error);
  }
};

export const downloadVideo = async (req, res, next) => {
  try {
    const { url, postUrl, thumbnailUrl, title } = req.body;
    const userId = req.user ? req.user.id : null;
    await downloadService.downloadVideo(url, userId, res, { postUrl, thumbnailUrl, title });
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    }
  }
};

export const streamVideo = async (req, res, next) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Video URL parameter is required.' });
    }
    await downloadService.streamVideoPlayer(url, res, req.headers);
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    }
  }
};

export const getThumbnail = async (req, res, next) => {
  try {
    let shortcode = req.params.shortcode || req.query.shortcode;
    let rawUrl = req.query.url;

    if (shortcode && shortcode.endsWith('.jpg')) {
      shortcode = shortcode.slice(0, -4);
    }

    if (!shortcode && rawUrl) {
      const match = rawUrl.match(/\/(reel|p|tv)\/([^\/?#]+)/i);
      if (match) {
        shortcode = match[2];
      }
    }

    if (!shortcode && rawUrl) {
      shortcode = thumbnailService.findMatchingThumbnail({ sourceUrl: rawUrl });
    }

    if (!shortcode) {
      shortcode = thumbnailService.findMatchingThumbnail();
    }

    await downloadService.serveThumbnail(shortcode, rawUrl, res);
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    }
  }
};
