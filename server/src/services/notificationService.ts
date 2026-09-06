import { prisma } from '../config/prisma';
import { sendCourseEmail } from './emailService';

import { sendPushToUser } from './pushService';

export async function notify(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
  email?: { to: string; subject: string },
) {
  await prisma.notification.create({ data: { userId, type, title, body, link } });
  await sendPushToUser(userId, { title, body, url: link, tag: type }).catch(() => undefined);
  const { publishToUser } = await import('../realtime');
  publishToUser(userId, { type: 'notification', title, body, link });
  if (email) {
    await sendCourseEmail(email.to, email.subject, title, body, link).catch(() => undefined);
  }
}

export async function notifyMatchingTemplate(template: { id: string; title: string; category: string; createdById: string }) {
  const downloads = await prisma.templateDownload.findMany({
    where: { template: { category: template.category }, userId: { not: template.createdById } },
    distinct: ['userId'],
    take: 80,
    select: { userId: true },
  });
  await Promise.all(
    downloads.map((row) =>
      notify(
        row.userId,
        'NEW_TEMPLATE',
        `New ${template.category} template`,
        template.title,
        `/templates/${template.id}`,
      ),
    ),
  );
}

export async function notifyInstructorsNewCourse(courseTitle: string, courseId: string) {
  void courseId;
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, email: true } });
  await Promise.all(
    admins.map((admin) =>
      notify(
        admin.id,
        'COURSE_SUBMITTED',
        'Course awaiting review',
        `${courseTitle} was submitted for publication.`,
        `/admin/courses`,
        { to: admin.email, subject: 'Sheettomate Institute: course submitted' },
      ),
    ),
  );
}
