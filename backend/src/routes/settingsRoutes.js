import { Router } from 'express';
import { z } from 'zod';
import { 
  getSettings, 
  updateSettings, 
  updateProfile,
  updatePassword, 
  verifyPassword,
  deleteAccount 
} from '../controllers/settingsController.js';
import { authenticateUser } from '../middleware/auth.js';
import { validateBody } from '../middleware/requestValidation.js';

const router = Router();

const profileUpdateSchema = z.object({
  name: z.string().optional(),
  userName: z.string().optional(),
  username: z.string().optional(),
  userId: z.string().optional(),
  email: z.string().email('Please enter a valid email address').optional(),
  picture: z.string().nullable().optional()
});

const passwordVerifySchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required')
});

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

const deleteAccountSchema = z.object({
  password: z.string().optional()
});

const preferencesSchema = z.object({
  defaultQuality: z.string().optional(),
  autoDownload: z.boolean().optional(),
  downloadNotifications: z.boolean().optional()
});

router.use(authenticateUser);

router.get('/', getSettings);
router.patch('/', validateBody(preferencesSchema), updateSettings);
router.patch('/profile', validateBody(profileUpdateSchema), updateProfile);
router.post('/verify-password', validateBody(passwordVerifySchema), verifyPassword);
router.patch('/password', validateBody(passwordUpdateSchema), updatePassword);
router.delete('/account', validateBody(deleteAccountSchema), deleteAccount);

export default router;
