import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/http';
import * as courses from '../services/courseService';

export async function listCourses(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(
      res,
      await courses.listCourses({
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        level: typeof req.query.level === 'string' ? req.query.level : undefined,
        featured: typeof req.query.featured === 'string' ? req.query.featured : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        user: req.user,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function getCourse(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.getCourse(String(req.params.id), req.user?.sub));
  } catch (error) {
    next(error);
  }
}

export async function createCourse(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.createCourse(req.user!, req.body), 201);
  } catch (error) {
    next(error);
  }
}

export async function updateCourse(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.updateCourse(req.user!, String(req.params.id), req.body));
  } catch (error) {
    next(error);
  }
}

export async function deleteCourse(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.deleteCourse(req.user!, String(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function submitCourse(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.submitForReview(req.user!, String(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function reviewCourse(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.reviewCourse(String(req.params.id), req.body.status, req.body.reason));
  } catch (error) {
    next(error);
  }
}

export async function featureCourse(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.setFeatured(String(req.params.id), Boolean(req.body.featured)));
  } catch (error) {
    next(error);
  }
}

export async function saveLesson(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.upsertLesson(req.user!, String(req.params.id), req.body), 201);
  } catch (error) {
    next(error);
  }
}

export async function removeLesson(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.deleteLesson(req.user!, String(req.params.lessonId)));
  } catch (error) {
    next(error);
  }
}

export async function reorder(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.reorderLessons(req.user!, String(req.params.id), req.body.ids));
  } catch (error) {
    next(error);
  }
}

export async function importLessons(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.importLessons(req.user!, String(req.params.id), req.body.lessons), 201);
  } catch (error) {
    next(error);
  }
}

export async function enroll(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await courses.enroll(req.user!.sub, String(req.params.id));
    return sendSuccess(res, result, result.requiresPayment ? 200 : 201);
  } catch (error) {
    next(error);
  }
}

export async function progress(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.getProgress(req.user!.sub, String(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function lessonContext(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.lessonContext(req.user!.sub, String(req.params.lessonId)));
  } catch (error) {
    next(error);
  }
}

export async function patchProgress(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.saveProgress(req.user!.sub, String(req.params.lessonId), req.body));
  } catch (error) {
    next(error);
  }
}

export async function quiz(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.submitQuiz(req.user!.sub, String(req.params.lessonId), req.body.answers));
  } catch (error) {
    next(error);
  }
}

export async function project(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.submitProject(req.user!.sub, String(req.params.lessonId), req.body.notes, req.body.fileUrl));
  } catch (error) {
    next(error);
  }
}

export async function bookmark(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.toggleBookmark(req.user!.sub, String(req.params.lessonId)));
  } catch (error) {
    next(error);
  }
}

export async function notes(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.saveNote(req.user!.sub, String(req.params.lessonId), req.body.body));
  } catch (error) {
    next(error);
  }
}

export async function ask(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.askQuestion(req.user!.sub, String(req.params.lessonId), req.body.body), 201);
  } catch (error) {
    next(error);
  }
}

export async function answer(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.answerQuestion(req.user!, String(req.params.questionId), req.body.body), 201);
  } catch (error) {
    next(error);
  }
}

export async function rate(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.rateCourse(req.user!.sub, String(req.params.id), req.body.rating, req.body.comment));
  } catch (error) {
    next(error);
  }
}

export async function certificate(req: Request, res: Response, next: NextFunction) {
  try {
    const cert = await courses.issueCertificate(req.user!.sub, String(req.params.id));
    const svg = courses.certificateSvg(cert);
    if (req.query.format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `attachment; filename="${cert.code}.svg"`);
      return res.send(svg);
    }
    return sendSuccess(res, { certificate: cert, svg });
  } catch (error) {
    next(error);
  }
}

export async function analytics(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.instructorAnalytics(req.user!, String(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function instructorMe(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.instructorAnalytics(req.user!));
  } catch (error) {
    next(error);
  }
}

export async function promo(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.createPromotion(req.user!, String(req.params.id), req.body), 201);
  } catch (error) {
    next(error);
  }
}

export async function reminders(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.sendReminders());
  } catch (error) {
    next(error);
  }
}

export async function instructors(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.listInstructors());
  } catch (error) {
    next(error);
  }
}

export async function notifications(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.listNotifications(req.user!.sub));
  } catch (error) {
    next(error);
  }
}

export async function readNotification(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await courses.markNotificationRead(req.user!.sub, String(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function myEnrollments(req: Request, res: Response, next: NextFunction) {
  try {
    const { prisma } = await import('../config/prisma');
    const items = await prisma.courseEnrollment.findMany({
      where: { userId: req.user!.sub },
      include: { course: true },
      orderBy: { enrollmentDate: 'desc' },
    });
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}
