import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { changePasswordSchema, updateProfileSchema } from '../validators/schemas';
import {
  becomeCreator,
  changePassword,
  getEnrolledCourses,
  getProfile,
  getPurchasedTemplates,
  updateProfile,
  uploadAvatar,
} from '../controllers/userController';

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Photo must be JPG, PNG, GIF, or WebP'));
  },
});

const router = Router();

router.use(authenticate);
router.get('/profile', getProfile);
router.put('/profile', validate(updateProfileSchema), updateProfile);
router.put('/password', validate(changePasswordSchema), changePassword);
router.post('/avatar', avatarUpload.single('avatar'), uploadAvatar);
router.post('/become-creator', becomeCreator);
router.get('/templates', getPurchasedTemplates);
router.get('/courses', getEnrolledCourses);

export default router;
