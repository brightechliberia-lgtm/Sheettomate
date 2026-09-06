import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRoles } from '../middleware/auth';
import { creatorAnalytics, creatorTemplates } from '../controllers/creatorController';

const router = Router();
router.use(authenticate, requireRoles(Role.CREATOR, Role.ADMIN));
router.get('/templates', creatorTemplates);
router.get('/analytics', creatorAnalytics);

export default router;
