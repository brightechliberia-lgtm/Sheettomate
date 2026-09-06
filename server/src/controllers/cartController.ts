import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/http';
import { NotFoundError } from '../utils/errors';
import { withCdn } from '../services/templateService';

export async function getCart(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user!.sub },
      include: { template: true },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, {
      items: items.map((item) => ({ ...item, template: withCdn(item.template) })),
    });
  } catch (error) {
    next(error);
  }
}

export async function addToCart(req: Request, res: Response, next: NextFunction) {
  try {
    const templateId = String(req.body.templateId ?? req.params.id);
    const template = await prisma.template.findUnique({ where: { id: templateId } });
    if (!template || !template.published) {
      throw new NotFoundError('Template not found');
    }
    const item = await prisma.cartItem.upsert({
      where: { userId_templateId: { userId: req.user!.sub, templateId } },
      update: {},
      create: { userId: req.user!.sub, templateId },
      include: { template: true },
    });
    return sendSuccess(res, { item: { ...item, template: withCdn(item.template) } }, 201);
  } catch (error) {
    next(error);
  }
}

export async function removeFromCart(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.cartItem.deleteMany({
      where: { userId: req.user!.sub, templateId: String(req.params.templateId) },
    });
    return sendSuccess(res, { removed: true });
  } catch (error) {
    next(error);
  }
}
