import { Router } from 'express';
import authRoutes from './authRoutes.js';
import videoRoutes from './videoRoutes.js';
import historyRoutes from './historyRoutes.js';
import settingsRoutes from './settingsRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/video', videoRoutes);
router.use('/history', historyRoutes);
router.use('/settings', settingsRoutes);

export default router;
