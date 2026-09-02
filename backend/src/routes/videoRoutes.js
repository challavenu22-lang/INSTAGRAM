import { Router } from 'express';
import { z } from 'zod';
import { searchVideo, downloadVideo, streamVideo } from '../controllers/videoController.js';
import { optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/requestValidation.js';
import { downloadRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const videoUrlSchema = z.object({
  url: z.string().min(1, 'Video URL is required')
});

router.post('/search', optionalAuth, validateBody(videoUrlSchema), searchVideo);
router.post('/download', optionalAuth, downloadRateLimiter, validateBody(videoUrlSchema), downloadVideo);
router.get('/stream', optionalAuth, streamVideo);

export default router;

