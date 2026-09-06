import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/http';
import { withCdn } from '../services/templateService';

export async function creatorTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.template.findMany({
      where: { createdById: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { downloads: true, ratings: true, questions: true } },
      },
    });
    return sendSuccess(res, { items: items.map((item) => withCdn(item)) });
  } catch (error) {
    next(error);
  }
}

export async function creatorAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const templates = await prisma.template.findMany({
      where: { createdById: req.user!.sub },
      include: {
        downloads: { include: { payment: true } },
        questions: { include: { answers: true, user: { select: { name: true } } } },
      },
    });

    const series = templates.map((template) => {
      const earnings = template.downloads.reduce((sum, row) => {
        if (row.payment?.status === 'COMPLETED') {
          return sum + Number(row.payment.amount);
        }
        return sum;
      }, 0);
      return {
        id: template.id,
        title: template.title,
        downloads: template.downloadCount,
        rating: template.averageRating,
        earnings,
        openQuestions: template.questions.filter((q) => q.answers.length === 0).length,
      };
    });

    const totals = series.reduce(
      (acc, row) => ({
        earnings: acc.earnings + row.earnings,
        downloads: acc.downloads + row.downloads,
        templates: acc.templates + 1,
      }),
      { earnings: 0, downloads: 0, templates: 0 },
    );

    const questions = templates.flatMap((template) =>
      template.questions.map((question) => ({
        ...question,
        templateTitle: template.title,
        templateId: template.id,
      })),
    );

    return sendSuccess(res, { totals, series, questions });
  } catch (error) {
    next(error);
  }
}
