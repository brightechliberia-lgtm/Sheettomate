import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, optionalAuthenticate, requireRoles, requireStaff } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createCourseSchema,
  importLessonsSchema,
  lessonSchema,
  noteSchema,
  progressSchema,
  projectSchema,
  promoSchema,
  quizSubmitSchema,
  reorderSchema,
  reviewCourseSchema,
  updateCourseSchema,
  courseRatingSchema,
  questionSchema,
} from '../validators/schemas';
import * as c from '../controllers/courseController';

const instructors = [Role.ADMIN, Role.CREATOR];
const router = Router();

router.get('/', optionalAuthenticate, c.listCourses);
router.get('/enrollments/me', authenticate, c.myEnrollments);
router.get('/instructor/me', authenticate, requireRoles(...instructors), c.instructorMe);
router.get('/instructors', authenticate, requireRoles(Role.ADMIN), requireStaff('courses'), c.instructors);
router.post('/reminders', authenticate, requireRoles(Role.ADMIN), requireStaff('courses'), c.reminders);
router.get('/notifications', authenticate, c.notifications);
router.post('/notifications/:id/read', authenticate, c.readNotification);

router.post('/', authenticate, requireRoles(...instructors), validate(createCourseSchema), c.createCourse);
router.get('/lessons/:lessonId', authenticate, c.lessonContext);
router.post('/lessons/:lessonId/progress', authenticate, validate(progressSchema), c.patchProgress);
router.post('/lessons/:lessonId/quiz', authenticate, validate(quizSubmitSchema), c.quiz);
router.post('/lessons/:lessonId/submit', authenticate, validate(projectSchema), c.project);
router.post('/lessons/:lessonId/bookmark', authenticate, c.bookmark);
router.put('/lessons/:lessonId/notes', authenticate, validate(noteSchema), c.notes);
router.post('/lessons/:lessonId/questions', authenticate, validate(questionSchema), c.ask);
router.post('/questions/:questionId/answers', authenticate, validate(questionSchema), c.answer);
router.get('/:id', optionalAuthenticate, c.getCourse);
router.put('/:id', authenticate, requireRoles(...instructors), validate(updateCourseSchema), c.updateCourse);
router.delete('/:id', authenticate, requireRoles(...instructors), c.deleteCourse);
router.post('/:id/submit', authenticate, requireRoles(...instructors), c.submitCourse);
router.post('/:id/review', authenticate, requireRoles(Role.ADMIN), requireStaff('courses'), validate(reviewCourseSchema), c.reviewCourse);
router.post('/:id/feature', authenticate, requireRoles(Role.ADMIN), requireStaff('courses'), c.featureCourse);
router.post('/:id/lessons', authenticate, requireRoles(...instructors), validate(lessonSchema), c.saveLesson);
router.put('/:id/lessons/order', authenticate, requireRoles(...instructors), validate(reorderSchema), c.reorder);
router.post('/:id/lessons/import', authenticate, requireRoles(...instructors), validate(importLessonsSchema), c.importLessons);
router.delete('/:id/lessons/:lessonId', authenticate, requireRoles(...instructors), c.removeLesson);
router.post('/:id/enroll', authenticate, c.enroll);
router.get('/:id/progress', authenticate, c.progress);
router.get('/:id/analytics', authenticate, requireRoles(...instructors), c.analytics);
router.post('/:id/ratings', authenticate, validate(courseRatingSchema), c.rate);
router.get('/:id/certificate', authenticate, c.certificate);
router.post('/:id/promos', authenticate, requireRoles(...instructors), validate(promoSchema), c.promo);

export default router;
