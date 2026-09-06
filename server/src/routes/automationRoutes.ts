import { Router } from 'express';
import multer from 'multer';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { authenticateJwtOrApiKey, requireScope } from '../middleware/apiKey';
import * as c from '../controllers/automationController';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const router = Router();

router.get('/catalog', c.catalog);
router.post('/hooks/:token', c.inboundFire);
router.get('/oauth/:provider/callback', optionalAuthenticate, c.oauthCallback);

router.use(authenticateJwtOrApiKey);

router.get('/workflows', c.listWorkflows);
router.post('/workflows', requireScope('automations:write'), c.createWorkflow);
router.get('/workflows/:id', c.getWorkflow);
router.put('/workflows/:id', requireScope('automations:write'), c.updateWorkflow);
router.delete('/workflows/:id', requireScope('automations:write'), c.deleteWorkflow);
router.post('/workflows/:id/run', requireScope('automations:write'), c.runNow);
router.post('/templates', requireScope('automations:write'), c.install);
router.get('/webhooks', c.listWebhooks);
router.post('/webhooks', requireScope('webhooks:manage'), c.createWebhook);
router.put('/webhooks/:id', requireScope('webhooks:manage'), c.updateWebhook);
router.delete('/webhooks/:id', requireScope('webhooks:manage'), c.deleteWebhook);
router.post('/webhooks/:id/test', requireScope('webhooks:manage'), c.testWebhook);
router.post('/deliveries/:id/retry', requireScope('webhooks:manage'), c.retryDelivery);
router.post('/inbound', requireScope('webhooks:manage'), c.createInbound);
router.get('/keys', c.listKeys);
router.post('/keys', authenticate, c.createKey);
router.delete('/keys/:id', authenticate, c.revokeKey);
router.get('/oauth', c.listOauth);
router.get('/oauth/:provider/start', c.oauthStart);
router.post('/import', upload.single('file'), requireScope('data:export'), c.importData);
router.post('/export', requireScope('data:export'), c.exportData);
router.get('/audit', c.audit);
router.post('/events', requireScope('automations:write'), c.fireEvent);

export default router;
