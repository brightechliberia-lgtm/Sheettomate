import { Router } from 'express';
import {
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from '../controllers/authController';
import { googleAuthCallback, googleAuthStatus, googleIdTokenLogin, startGoogleAuth } from '../services/googleAuth';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/schemas';

const router = Router();

router.get('/google/status', googleAuthStatus);
router.get('/google', startGoogleAuth);
router.get('/google/callback', googleAuthCallback);
router.post('/google/id-token', googleIdTokenLogin);
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), resendVerification);
router.get('/me', authenticate, me);

export default router;
