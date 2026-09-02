import { downloadService } from '../services/downloadService.js';

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
    const { url } = req.body;
    const userId = req.user ? req.user.id : null;
    await downloadService.downloadVideo(url, userId, res);
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
