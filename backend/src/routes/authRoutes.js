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

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#^~=+\\[\]{}()|;:,.<>/])[A-Za-z\d@$!%*?&_\-#^~=+\\[\]{}()|;:,.<>/]+$/;

const registerSchema = z.object({
  fullName: z.string().optional(),
  name: z.string().optional(),
  userName: z.string().optional(),
  username: z.string().optional(),
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .refine((val) => /[A-Z]/.test(val), 'Password must contain at least one uppercase letter')
    .refine((val) => /[a-z]/.test(val), 'Password must contain at least one lowercase letter')
    .refine((val) => /\d/.test(val), 'Password must contain at least one number')
    .refine((val) => /[^A-Za-z0-9]/.test(val), 'Password must contain at least one special character')
}).refine((data) => Boolean((data.userName && data.userName.trim()) || (data.username && data.username.trim())), {
  message: 'User Name is required',
  path: ['userName']
});


const loginSchema = z.object({
  identifier: z.string().min(1, 'User Name or Email is required'),
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
