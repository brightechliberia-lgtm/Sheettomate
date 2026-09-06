import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRoles, requireStaff } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateRoleSchema, adminUpdateUserSchema } from '../validators/schemas';
import {
  deleteUser,
  listUsers,
  updateUser,
  updateUserRole,
  aiUsage,
  listPromptTemplates,
  upsertPromptTemplate,
  deletePromptTemplate,
  updateAiSettings,
} from '../controllers/adminController';
import * as d from '../controllers/adminDashboardController';

const router = Router();

router.use(authenticate, requireRoles(Role.ADMIN));

router.get('/overview', requireStaff('overview'), d.overview);
router.get('/analytics/revenue', requireStaff('analytics'), d.revenue);
router.get('/analytics/users', requireStaff('analytics'), d.usersAnalytics);
router.get('/analytics/content', requireStaff('analytics'), d.content);
router.get('/analytics/ai', requireStaff('ai'), d.ai);
router.get('/analytics/geo', requireStaff('analytics'), d.geo);
router.get('/reports/export', requireStaff('reports'), d.exportReport);
router.get('/reports/scheduled', requireStaff('reports'), d.listScheduled);
router.post('/reports/scheduled', requireStaff('reports'), d.scheduleReport);
router.post('/reports/run', requireStaff('reports'), d.runScheduledReports);

router.get('/users', requireStaff('users'), d.listAdminUsers);
router.get('/users-legacy', listUsers);
router.put('/users/:id', requireStaff('users'), validate(adminUpdateUserSchema), updateUser);
router.put('/users/:id/role', requireStaff('users'), validate(updateRoleSchema), updateUserRole);
router.patch('/users/:id/role', requireStaff('users'), validate(updateRoleSchema), updateUserRole);
router.post('/users/:id/staff', requireStaff('settings'), d.setStaffRole);
router.post('/users/:id/suspend', requireStaff('users'), d.setSuspended);
router.post('/users/bulk', requireStaff('users'), d.bulkUsers);
router.delete('/users/:id', requireStaff('users'), deleteUser);

router.get('/templates', requireStaff('templates'), d.listTemplatesAdmin);
router.patch('/templates/:id', requireStaff('templates'), d.patchTemplate);

router.get('/payments', requireStaff('payments'), d.listPaymentsAdmin);
router.post('/payments/:id/refund', requireStaff('payments'), d.refundPayment);

router.get('/flags', requireStaff('moderation'), d.listFlags);
router.post('/flags', requireStaff('moderation'), d.createFlag);
router.post('/flags/:id', requireStaff('moderation'), d.resolveFlag);
router.get('/reviews', requireStaff('moderation'), d.listReviews);
router.delete('/reviews/:id', requireStaff('moderation'), d.deleteReview);

router.get('/cms', requireStaff('cms'), d.listCms);
router.post('/cms', requireStaff('cms'), d.upsertCms);
router.post('/announcements', requireStaff('cms'), d.createAnnouncement);

router.get('/settings', requireStaff('settings'), d.getSettings);
router.put('/settings', requireStaff('settings'), d.saveSettings);
router.get('/catalog', requireStaff('settings'), d.getCatalog);
router.put('/catalog', requireStaff('settings'), d.saveCatalog);

router.get('/health', requireStaff('health'), d.health);

router.get('/ai/usage', requireStaff('ai'), aiUsage);
router.get('/ai/prompts', requireStaff('ai'), listPromptTemplates);
router.post('/ai/prompts', requireStaff('ai'), upsertPromptTemplate);
router.put('/ai/prompts', requireStaff('ai'), upsertPromptTemplate);
router.delete('/ai/prompts/:id', requireStaff('ai'), deletePromptTemplate);
router.put('/ai/settings', requireStaff('ai'), updateAiSettings);

export default router;
