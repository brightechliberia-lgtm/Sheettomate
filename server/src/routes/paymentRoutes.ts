import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRoles, requireStaff } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { initiatePaymentSchema, walletTopupSchema } from '../validators/schemas';
import {
  analytics,
  getStatus,
  getWallet,
  history,
  initiate,
  paymentsConfig,
  topUpWallet,
  verifyPayment,
  webhook,
} from '../controllers/paymentController';

const router = Router();

router.get('/config', paymentsConfig);
router.post('/webhook', webhook);
router.post('/initiate', authenticate, validate(initiatePaymentSchema), initiate);
router.post('/checkout', authenticate, validate(initiatePaymentSchema), initiate);
router.post('/verify/:reference', authenticate, verifyPayment);
router.get('/status/:id', authenticate, getStatus);
router.get('/history', authenticate, history);
router.get('/me', authenticate, history);
router.get('/wallet', authenticate, getWallet);
router.post('/wallet/topup', authenticate, validate(walletTopupSchema), topUpWallet);
router.get('/analytics', authenticate, requireRoles(Role.ADMIN), requireStaff('payments'), analytics);

export default router;
