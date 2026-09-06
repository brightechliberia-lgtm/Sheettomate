import crypto from 'crypto';
import { CourseStatus, LessonType, Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';
import { notify, notifyInstructorsNewCourse } from './notificationService';
import { sendPushToUser } from './pushService';
import {
  detectVideoProvider,
  embedUrl,
  percentComplete,
  scoreQuiz,
  slugify,
  type QuizQuestion,
} from '../courses/progress';

function canManage(user: { sub: string; role: Role }, instructorId: string) {
  return user.role === Role.ADMIN || user.sub === instructorId;
}

export async function listCourses(query: {
  q?: string;
  level?: string;
  featured?: string;
  status?: string;
  user?: { sub: string; role: Role };
}) {
  const where: Prisma.CourseWhereInput = {};
  const search = query.q
    ? {
        OR: [
          { title: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
        ],
      }
    : undefined;
  if (query.level) where.level = query.level as never;
  if (query.featured === 'true') where.featured = true;
  const visibility: Prisma.CourseWhereInput =
    query.user?.role === Role.ADMIN
      ? query.status
        ? { status: query.status as CourseStatus }
        : {}
      : query.user?.role === Role.CREATOR
        ? { OR: [{ status: 'PUBLISHED' }, { instructorId: query.user.sub }] }
        : { status: 'PUBLISHED' };
  where.AND = [visibility, search].filter(Boolean) as Prisma.CourseWhereInput[];

  const items = await prisma.course.findMany({
    where,
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    include: {
      instructor: { select: { id: true, name: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
  });
  return { items };
}

export async function getCourse(id: string, userId?: string) {
  const course = await prisma.course.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      instructor: { select: { id: true, name: true, email: true } },
      lessons: { orderBy: { sortOrder: 'asc' }, include: { resources: true } },
      ratings: { take: 8, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!course) throw new NotFoundError('Course not found');
  if (course.status !== 'PUBLISHED' && userId !== course.instructorId) {
    const actor = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
      : null;
    if (actor?.role !== 'ADMIN') throw new NotFoundError('Course not found');
  }
  let enrollment = null;
  let progressRows: { lessonId: string; completed: boolean; positionSec: number }[] = [];
  if (userId) {
    enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });
    progressRows = await prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: course.lessons.map((l) => l.id) } },
    });
  }
  return {
    course: {
      ...course,
      lessons: course.lessons.map((lesson) => ({
        ...lesson,
        embedUrl: embedUrl(lesson.videoUrl),
        quiz: lesson.type === 'QUIZ' ? sanitizeQuiz(lesson.quiz) : null,
      })),
    },
    enrollment,
    progress: progressRows,
  };
}

function sanitizeQuiz(quiz: Prisma.JsonValue | null) {
  if (!quiz || typeof quiz !== 'object') return null;
  const data = quiz as { passingScore?: number; questions?: QuizQuestion[] };
  const questions = (data.questions ?? []).map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    choices: q.choices,
  }));
  return { passingScore: data.passingScore ?? 70, questions };
}

export async function createCourse(
  user: { sub: string; role: Role },
  body: {
    title: string;
    description: string;
    category?: string;
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    price: number;
    thumbnailUrl?: string;
    objectives?: string[];
    prerequisites?: string;
  },
) {
  const course = await prisma.course.create({
    data: {
      slug: slugify(body.title),
      title: body.title,
      description: body.description,
      category: body.category,
      level: body.level,
      price: body.price,
      thumbnailUrl: body.thumbnailUrl,
      objectives: body.objectives ?? [],
      prerequisites: body.prerequisites ?? '',
      instructorId: user.sub,
      status: user.role === Role.ADMIN ? 'PUBLISHED' : 'DRAFT',
    },
  });
  return { course };
}

export async function updateCourse(
  user: { sub: string; role: Role },
  id: string,
  body: Record<string, unknown>,
) {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new NotFoundError('Course not found');
  if (!canManage(user, course.instructorId)) throw new ForbiddenError();
  const updated = await prisma.course.update({
    where: { id },
    data: {
      title: body.title as string | undefined,
      description: body.description as string | undefined,
      category: body.category as string | undefined,
      level: body.level as never,
      price: body.price as number | undefined,
      thumbnailUrl: body.thumbnailUrl as string | undefined,
      objectives: body.objectives as string[] | undefined,
      prerequisites: body.prerequisites as string | undefined,
      promoPercent: body.promoPercent as number | undefined,
    },
  });
  return { course: updated };
}

export async function deleteCourse(user: { sub: string; role: Role }, id: string) {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new NotFoundError('Course not found');
  if (!canManage(user, course.instructorId)) throw new ForbiddenError();
  await prisma.course.delete({ where: { id } });
  return { deleted: true };
}

export async function submitForReview(user: { sub: string; role: Role }, id: string) {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new NotFoundError('Course not found');
  if (!canManage(user, course.instructorId)) throw new ForbiddenError();
  const updated = await prisma.course.update({
    where: { id },
    data: { status: 'PENDING_REVIEW', rejectionReason: null },
  });
  await notifyInstructorsNewCourse(course.title, course.id);
  return { course: updated };
}

export async function reviewCourse(id: string, status: 'PUBLISHED' | 'REJECTED', reason?: string) {
  const course = await prisma.course.update({
    where: { id },
    data: { status, rejectionReason: status === 'REJECTED' ? reason ?? 'Needs revision' : null },
    include: { instructor: true },
  });
  await notify(
    course.instructorId,
    status === 'PUBLISHED' ? 'COURSE_APPROVED' : 'COURSE_REJECTED',
    status === 'PUBLISHED' ? 'Your course is live' : 'Course needs changes',
    status === 'PUBLISHED'
      ? `${course.title} is now published on Sheettomate Institute.`
      : `${course.title}: ${course.rejectionReason}`,
    `/instructor/courses/${course.id}`,
    {
      to: course.instructor.email,
      subject: status === 'PUBLISHED' ? 'Course approved' : 'Course rejected',
    },
  );
  if (status === 'PUBLISHED') {
    const learners = await prisma.user.findMany({
      where: { role: { in: ['LEARNER', 'USER'] } },
      select: { id: true },
      take: 200,
    });
    await prisma.notification.createMany({
      data: learners.map((u) => ({
        userId: u.id,
        type: 'NEW_COURSE',
        title: 'New Institute course',
        body: course.title,
        link: `/courses/${course.id}`,
      })),
    });
    await Promise.all(
      learners.map((u) =>
        sendPushToUser(u.id, {
          title: 'Course reminder',
          body: `${course.title} is ready on Sheettomate Institute.`,
          url: `/courses/${course.id}`,
          tag: 'COURSE_REMINDER',
        }).catch(() => undefined),
      ),
    );
  }
  return { course };
}

export async function setFeatured(id: string, featured: boolean) {
  return { course: await prisma.course.update({ where: { id }, data: { featured } }) };
}

export async function upsertLesson(
  user: { sub: string; role: Role },
  courseId: string,
  input: {
    id?: string;
    title: string;
    moduleTitle?: string | null;
    type: LessonType;
    content?: string;
    videoUrl?: string;
    durationSec?: number;
    quiz?: unknown;
    practiceTemplateId?: string;
    sortOrder?: number;
    resources?: { title: string; url: string; kind?: string }[];
  },
) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new NotFoundError('Course not found');
  if (!canManage(user, course.instructorId)) throw new ForbiddenError();
  const data = {
    title: input.title,
    moduleTitle: input.moduleTitle?.trim() || null,
    type: input.type,
    content: input.content ?? '',
    videoUrl: input.videoUrl,
    videoProvider: detectVideoProvider(input.videoUrl),
    durationSec: input.durationSec ?? 0,
    quiz: input.quiz as Prisma.InputJsonValue | undefined,
    practiceTemplateId: input.practiceTemplateId,
    sortOrder: input.sortOrder ?? 0,
  };
  const lesson = input.id
    ? await prisma.lesson.update({ where: { id: input.id }, data })
    : await prisma.lesson.create({ data: { ...data, courseId } });
  if (input.resources) {
    await prisma.lessonResource.deleteMany({ where: { lessonId: lesson.id } });
    if (input.resources.length) {
      await prisma.lessonResource.createMany({
        data: input.resources.map((r) => ({
          lessonId: lesson.id,
          title: r.title,
          url: r.url,
          kind: r.kind ?? 'file',
        })),
      });
    }
  }
  return { lesson: await prisma.lesson.findUnique({ where: { id: lesson.id }, include: { resources: true } }) };
}

export async function deleteLesson(user: { sub: string; role: Role }, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({ include: { course: true }, where: { id: lessonId } });
  if (!lesson) throw new NotFoundError('Lesson not found');
  if (!canManage(user, lesson.course.instructorId)) throw new ForbiddenError();
  await prisma.lesson.delete({ where: { id: lessonId } });
  return { deleted: true };
}

export async function reorderLessons(user: { sub: string; role: Role }, courseId: string, ids: string[]) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new NotFoundError('Course not found');
  if (!canManage(user, course.instructorId)) throw new ForbiddenError();
  await prisma.$transaction(ids.map((id, index) => prisma.lesson.update({ where: { id }, data: { sortOrder: index } })));
  return { ok: true };
}

export async function importLessons(
  user: { sub: string; role: Role },
  courseId: string,
  lessons: Array<{
    title: string;
    moduleTitle?: string | null;
    type: LessonType;
    content?: string;
    videoUrl?: string;
    quiz?: unknown;
    resources?: { title: string; url: string }[];
  }>,
) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new NotFoundError('Course not found');
  if (!canManage(user, course.instructorId)) throw new ForbiddenError();
  const created = [];
  for (let i = 0; i < lessons.length; i += 1) {
    const row = lessons[i];
    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        sortOrder: i,
        title: row.title,
        moduleTitle: row.moduleTitle?.trim() || null,
        type: row.type,
        content: row.content ?? '',
        videoUrl: row.videoUrl,
        videoProvider: detectVideoProvider(row.videoUrl),
        quiz: row.quiz as Prisma.InputJsonValue | undefined,
        resources: row.resources?.length
          ? { create: row.resources.map((r) => ({ title: r.title, url: r.url })) }
          : undefined,
      },
    });
    created.push(lesson);
  }
  return { count: created.length };
}

export async function enroll(userId: string, courseId: string, paid = false) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new NotFoundError('Course not found');
  if (course.status !== 'PUBLISHED') throw new ForbiddenError('Course is not published');
  const existing = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) throw new ConflictError('Already enrolled');
  const price = effectivePrice(course);
  if (price > 0 && !paid) {
    return { requiresPayment: true, courseId, amountUsd: price, title: course.title };
  }
  const enrollment = await prisma.courseEnrollment.create({
    data: { userId, courseId, progress: 0 },
  });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    await notify(
      userId,
      'ENROLLMENT',
      'You are enrolled',
      `Welcome to ${course.title}. Resume anytime from Sheettomate Institute.`,
      `/courses/${course.id}/learn`,
      { to: user.email, subject: `Enrolled: ${course.title}` },
    );
  }
  return { enrollment, requiresPayment: false };
}

export function effectivePrice(course: { price: Prisma.Decimal | number; promoPercent: number }) {
  const price = Number(course.price);
  return Number((price * (1 - (course.promoPercent || 0) / 100)).toFixed(2));
}

export async function enrollFromPayment(userId: string, courseId: string) {
  try {
    const result = await enroll(userId, courseId, true);
    return result.enrollment;
  } catch (error) {
    if (error instanceof ConflictError) {
      return prisma.courseEnrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
    }
    throw error;
  }
}

export async function getProgress(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { lessons: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!course) throw new NotFoundError('Course not found');
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) throw new ForbiddenError('Not enrolled');
  const rows = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: course.lessons.map((l) => l.id) } },
  });
  const completed = rows.filter((r) => r.completed).length;
  const progress = percentComplete(completed, course.lessons.length);
  return {
    enrollment: { ...enrollment, progress },
    lessons: course.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      completed: rows.find((r) => r.lessonId === lesson.id)?.completed ?? false,
      positionSec: rows.find((r) => r.lessonId === lesson.id)?.positionSec ?? 0,
    })),
    lastLessonId: enrollment.lastLessonId ?? course.lessons[0]?.id,
  };
}

async function requireEnrollment(userId: string, courseId: string) {
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) throw new ForbiddenError('Enroll to access lessons');
  return enrollment;
}

async function refreshEnrollmentProgress(userId: string, courseId: string) {
  const data = await getProgress(userId, courseId);
  const completedAt = data.enrollment.progress >= 100 ? new Date() : null;
  await prisma.courseEnrollment.update({
    where: { userId_courseId: { userId, courseId } },
    data: { progress: data.enrollment.progress, completedAt },
  });
  if (completedAt) {
    const cert = await issueCertificate(userId, courseId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (user && course) {
      await notify(
        userId,
        'CERTIFICATE',
        'Certificate ready',
        `You completed ${course.title}. Download your certificate.`,
        `/courses/${courseId}/certificate`,
        { to: user.email, subject: 'Your Sheettomate Institute certificate' },
      );
    }
    return cert;
  }
  return null;
}

export async function saveProgress(
  userId: string,
  lessonId: string,
  patch: { completed?: boolean; positionSec?: number },
) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new NotFoundError('Lesson not found');
  await requireEnrollment(userId, lesson.courseId);
  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      completed: patch.completed ?? undefined,
      positionSec: patch.positionSec ?? undefined,
      completedAt: patch.completed ? new Date() : undefined,
    },
    create: {
      userId,
      lessonId,
      completed: patch.completed ?? false,
      positionSec: patch.positionSec ?? 0,
      completedAt: patch.completed ? new Date() : null,
    },
  });
  await prisma.courseEnrollment.update({
    where: { userId_courseId: { userId, courseId: lesson.courseId } },
    data: { lastLessonId: lessonId },
  });
  await refreshEnrollmentProgress(userId, lesson.courseId);
  return { progress };
}

export async function submitQuiz(userId: string, lessonId: string, answers: Record<string, string | boolean>) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || lesson.type !== 'QUIZ') throw new NotFoundError('Quiz not found');
  await requireEnrollment(userId, lesson.courseId);
  const quiz = lesson.quiz as { questions?: QuizQuestion[] } | null;
  const result = scoreQuiz(quiz?.questions ?? [], answers);
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      quizScore: result.score,
      completed: result.passed,
      completedAt: result.passed ? new Date() : null,
    },
    create: {
      userId,
      lessonId,
      quizScore: result.score,
      completed: result.passed,
      completedAt: result.passed ? new Date() : null,
    },
  });
  await refreshEnrollmentProgress(userId, lesson.courseId);
  return result;
}

export async function submitProject(userId: string, lessonId: string, notes: string, fileUrl?: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || (lesson.type !== 'PROJECT' && lesson.type !== 'PRACTICE')) {
    throw new NotFoundError('Project lesson not found');
  }
  await requireEnrollment(userId, lesson.courseId);
  const submission = await prisma.projectSubmission.create({
    data: { userId, lessonId, notes, fileUrl },
  });
  await saveProgress(userId, lessonId, { completed: true });
  return { submission };
}

export async function toggleBookmark(userId: string, lessonId: string) {
  const existing = await prisma.lessonBookmark.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });
  if (existing) {
    await prisma.lessonBookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }
  await prisma.lessonBookmark.create({ data: { userId, lessonId } });
  return { bookmarked: true };
}

export async function saveNote(userId: string, lessonId: string, body: string) {
  const note = await prisma.lessonNote.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { body },
    create: { userId, lessonId, body },
  });
  return { note };
}

export async function askQuestion(userId: string, lessonId: string, body: string) {
  const question = await prisma.lessonQuestion.create({
    data: { userId, lessonId, body },
    include: { user: { select: { name: true } }, answers: true },
  });
  return { question };
}

export async function answerQuestion(user: { sub: string; role: Role }, questionId: string, body: string) {
  const question = await prisma.lessonQuestion.findUnique({
    include: { lesson: { include: { course: true } } },
    where: { id: questionId },
  });
  if (!question) throw new NotFoundError('Question not found');
  if (!canManage(user, question.lesson.course.instructorId) && user.sub !== question.userId) {
    throw new ForbiddenError();
  }
  const answer = await prisma.lessonAnswer.create({
    data: { questionId, userId: user.sub, body },
  });
  return { answer };
}

export async function rateCourse(userId: string, courseId: string, rating: number, comment?: string) {
  await requireEnrollment(userId, courseId);
  await prisma.courseRating.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: { rating, comment },
    create: { userId, courseId, rating, comment },
  });
  const agg = await prisma.courseRating.aggregate({
    where: { courseId },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.course.update({
    where: { id: courseId },
    data: { averageRating: agg._avg.rating ?? 0, ratingCount: agg._count },
  });
  return { ok: true };
}

export async function issueCertificate(userId: string, courseId: string) {
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: { course: true, user: true },
  });
  if (existing) return existing;
  const progress = await getProgress(userId, courseId);
  if (progress.enrollment.progress < 100) {
    throw new ValidationError('Complete every lesson to unlock the certificate');
  }
  const code = `SMT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  return prisma.certificate.create({
    data: { userId, courseId, code },
    include: { course: true, user: true },
  });
}

export function certificateSvg(cert: {
  code: string;
  issuedAt: Date;
  user: { name: string };
  course: { title: string; level: string };
}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="620" viewBox="0 0 900 620">
  <rect width="900" height="620" fill="#fafaf9" stroke="#17633d" stroke-width="12"/>
  <text x="450" y="90" text-anchor="middle" font-size="18" fill="#17633d" font-family="Georgia">SHEETTOMATE INSTITUTE</text>
  <text x="450" y="150" text-anchor="middle" font-size="36" font-family="Georgia" fill="#1c1917">Certificate of Completion</text>
  <text x="450" y="230" text-anchor="middle" font-size="16" fill="#57534e" font-family="Arial">This certifies that</text>
  <text x="450" y="290" text-anchor="middle" font-size="32" font-family="Georgia" fill="#17633d">${escapeXml(cert.user.name)}</text>
  <text x="450" y="350" text-anchor="middle" font-size="16" fill="#57534e" font-family="Arial">has completed</text>
  <text x="450" y="400" text-anchor="middle" font-size="22" font-family="Georgia">${escapeXml(cert.course.title)}</text>
  <text x="450" y="450" text-anchor="middle" font-size="14" fill="#78716c">${cert.course.level} · Liberia &amp; West Africa</text>
  <text x="450" y="530" text-anchor="middle" font-size="12" fill="#57534e">${cert.code} · ${cert.issuedAt.toISOString().slice(0, 10)}</text>
  <text x="450" y="560" text-anchor="middle" font-size="12" fill="#17633d">${env.clientOrigin}</text>
</svg>`;
}

function escapeXml(value: string) {
  return value.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!));
}

export async function instructorAnalytics(user: { sub: string; role: Role }, courseId?: string) {
  const where = user.role === Role.ADMIN ? (courseId ? { id: courseId } : {}) : { instructorId: user.sub, ...(courseId ? { id: courseId } : {}) };
  const courses = await prisma.course.findMany({
    where,
    include: {
      enrollments: true,
      lessons: { include: { progress: true } },
      ratings: true,
      paymentItems: { include: { payment: true } },
    },
  });
  return {
    items: courses.map((course) => {
      const students = course.enrollments.length;
      const completed = course.enrollments.filter((e) => e.progress >= 100).length;
      const revenue = course.paymentItems
        .filter((i) => i.payment.status === 'COMPLETED')
        .reduce((s, i) => s + Number(i.amountUsd), 0);
      const engagement = course.lessons.map((lesson) => ({
        lessonId: lesson.id,
        title: lesson.title,
        completions: lesson.progress.filter((p) => p.completed).length,
      }));
      return {
        id: course.id,
        title: course.title,
        students,
        completionRate: students ? Math.round((completed / students) * 100) : 0,
        averageRating: course.averageRating,
        revenueUsd: revenue,
        engagement,
      };
    }),
  };
}

export async function createPromotion(
  user: { sub: string; role: Role },
  courseId: string,
  input: { code: string; percentOff: number; startsAt: string; endsAt?: string },
) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new NotFoundError('Course not found');
  if (user.role !== Role.ADMIN && course.instructorId !== user.sub) throw new ForbiddenError();
  const promo = await prisma.coursePromotion.create({
    data: {
      courseId,
      code: input.code.toUpperCase(),
      percentOff: input.percentOff,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    },
  });
  await prisma.course.update({ where: { id: courseId }, data: { promoPercent: input.percentOff } });
  return { promotion: promo };
}

export async function sendReminders() {
  const stale = await prisma.courseEnrollment.findMany({
    where: {
      progress: { lt: 100 },
      reminderSentAt: null,
      enrollmentDate: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    },
    include: { user: true, course: true },
    take: 50,
  });
  for (const row of stale) {
    await notify(
      row.userId,
      'REMINDER',
      'Continue learning',
      `Pick up ${row.course.title} where you left off.`,
      `/courses/${row.courseId}/learn`,
      { to: row.user.email, subject: `Continue: ${row.course.title}` },
    );
    await prisma.courseEnrollment.update({
      where: { id: row.id },
      data: { reminderSentAt: new Date() },
    });
  }
  return { sent: stale.length };
}

export async function lessonContext(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      resources: true,
      questions: { include: { user: { select: { name: true } }, answers: { include: { user: { select: { name: true } } } } } },
    },
  });
  if (!lesson) throw new NotFoundError('Lesson not found');
  await requireEnrollment(userId, lesson.courseId);
  const [note, bookmark, progress] = await Promise.all([
    prisma.lessonNote.findUnique({ where: { userId_lessonId: { userId, lessonId } } }),
    prisma.lessonBookmark.findUnique({ where: { userId_lessonId: { userId, lessonId } } }),
    prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } }),
  ]);
  return {
    lesson: { ...lesson, embedUrl: embedUrl(lesson.videoUrl), quiz: sanitizeQuiz(lesson.quiz) },
    note,
    bookmarked: Boolean(bookmark),
    progress,
  };
}

export async function listNotifications(userId: string) {
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });
  return { items, unread: items.filter((n) => !n.readAt).length };
}

export async function markNotificationRead(userId: string, id: string) {
  await prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
  return { ok: true };
}

export async function listInstructors() {
  const items = await prisma.user.findMany({
    where: { role: { in: ['CREATOR', 'ADMIN'] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: { select: { instructedCourses: true } },
    },
  });
  return { items };
}
