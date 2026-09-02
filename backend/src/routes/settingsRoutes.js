import { Router } from 'express';
import { z } from 'zod';
import { 
  getSettings, 
  updateSettings, 
  updatePassword, 
  deleteAccount 
} from '../controllers/settingsController.js';
import { authenticateUser } from '../middleware/auth.js';
import { validateBody } from '../middleware/requestValidation.js';

const router = Router();

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password confirmation is required for account deletion')
});

const preferencesSchema = z.object({
  defaultQuality: z.string().optional(),
  autoDownload: z.boolean().optional(),
  downloadNotifications: z.boolean().optional()
});

router.use(authenticateUser);

router.get('/', getSettings);
router.patch('/', validateBody(preferencesSchema), updateSettings);
router.patch('/password', validateBody(passwordUpdateSchema), updatePassword);
router.delete('/account', validateBody(deleteAccountSchema), deleteAccount);

export default router;
