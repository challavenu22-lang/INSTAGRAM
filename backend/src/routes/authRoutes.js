import { Router } from 'express';
import { z } from 'zod';
import { 
  register, 
  verifyEmail, 
  login, 
  logout, 
  logoutAll, 
  forgotPassword, 
  resetPassword, 
  me 
} from '../controllers/authController.js';
import { authenticateUser } from '../middleware/auth.js';
import { validateBody } from '../middleware/requestValidation.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long')
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long')
});

router.post('/register', authRateLimiter, validateBody(registerSchema), register);
router.post('/verify-email', authRateLimiter, validateBody(verifyEmailSchema), verifyEmail);
router.post('/login', authRateLimiter, validateBody(loginSchema), login);
router.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authRateLimiter, validateBody(resetPasswordSchema), resetPassword);

// Protected Auth Routes
router.post('/logout', authenticateUser, logout);
router.post('/logout-all', authenticateUser, logoutAll);
router.get('/me', authenticateUser, me);

export default router;
