import { Router } from 'express';
import { z } from 'zod';
import { searchVideo, downloadVideo, streamVideo, getThumbnail } from '../controllers/videoController.js';
import { optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/requestValidation.js';
import { downloadRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const videoUrlSchema = z.object({
  url: z.string().min(1, 'Video URL is required'),
  postUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  title: z.string().optional()
}).passthrough();

router.post('/search', optionalAuth, validateBody(videoUrlSchema), searchVideo);
router.post('/download', optionalAuth, downloadRateLimiter, validateBody(videoUrlSchema), downloadVideo);
router.get('/stream', optionalAuth, streamVideo);
router.get('/thumbnail/:shortcode', optionalAuth, getThumbnail);
router.get('/thumbnail', optionalAuth, getThumbnail);

export default router;

