import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  aiFeedbackSchema,
  aiGenerateSchema,
  aiPublishSchema,
  aiRefineSchema,
} from '../validators/schemas';
import {
  createAiRequest,
  feedback,
  generate,
  getResult,
  getStatus,
  myAiRequests,
  publishGenerated,
  refine,
  streamStatus,
  suggestions,
} from '../controllers/aiController';

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI requests. Slow down.' },
});

const router = Router();
router.use(authenticate, requirePermission('ai:request'));
router.get('/suggestions', suggestions);
router.get('/me', myAiRequests);
router.post('/generate', limiter, validate(aiGenerateSchema), generate);
router.post('/', limiter, validate(aiGenerateSchema), createAiRequest);
router.post('/refine', limiter, validate(aiRefineSchema), refine);
router.post('/feedback', validate(aiFeedbackSchema), feedback);
router.post('/publish', validate(aiPublishSchema), publishGenerated);
router.get('/status/:requestId', getStatus);
router.get('/stream/:requestId', streamStatus);
router.get('/result/:requestId', getResult);

export default router;
