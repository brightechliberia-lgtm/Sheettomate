import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, status = 200, message?: string) {
  return res.status(status).json({ success: true, data, message });
}
