import { Router } from 'express';
import multer from 'multer';
import { Role } from '@prisma/client';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  answerQuestion,
  askQuestion,
  consumeDownload,
  createTemplate,
  deleteTemplate,
  getPreview,
  getTemplate,
  initiateDownload,
  listCategories,
  listTemplates,
  rateTemplate,
  searchTemplatesHandler,
  updateTemplate,
} from '../controllers/templateController';
import { addToCart } from '../controllers/cartController';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'preview') {
      if (/image\/|svg/.test(file.mimetype) || file.originalname.match(/\.(png|jpe?g|webp|svg)$/i)) {
        cb(null, true);
        return;
      }
      cb(new Error('Preview must be an image'));
      return;
    }
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/vnd.google-apps.spreadsheet',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only Excel/CSV template files are allowed'));
  },
});

const templateUpload = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'preview', maxCount: 1 },
]);

const router = Router();

router.get('/', listTemplates);
router.get('/categories', listCategories);
router.get('/search', searchTemplatesHandler);
router.get('/download/:token', consumeDownload);
router.get('/:id/preview', getPreview);
router.get('/:id', getTemplate);
router.post('/', authenticate, requireRoles(Role.ADMIN, Role.CREATOR), templateUpload, createTemplate);
router.put('/:id', authenticate, requireRoles(Role.ADMIN, Role.CREATOR), templateUpload, updateTemplate);
router.delete('/:id', authenticate, requireRoles(Role.ADMIN, Role.CREATOR), deleteTemplate);
router.post('/:id/download', authenticate, initiateDownload);
router.post('/:id/ratings', authenticate, rateTemplate);
router.post('/:id/questions', authenticate, askQuestion);
router.post('/:id/questions/:questionId/answers', authenticate, requireRoles(Role.ADMIN, Role.CREATOR), answerQuestion);
router.post('/:id/cart', authenticate, addToCart);

export default router;
