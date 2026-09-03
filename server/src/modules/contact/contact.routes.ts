import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../utils/async';
import { AppError, ok } from '../../utils/http';
import { validate } from '../../middleware/validate';
import { hasRole, isAuthenticated } from '../../middleware/auth';
import { csrfProtection } from '../../middleware/csrf';
import { contactLimiter } from '../../middleware/rateLimit';
import { clientIp } from '../../utils/request';
import { stripTags } from '../../utils/sanitize';

const text = (min: number, max: number, message: string) =>
  z.string().transform(stripTags).pipe(z.string().min(min, message).max(max));

const messageSchema = z.object({
  name: text(2, 80, 'Enter your name.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  subject: z.string().transform(stripTags).pipe(z.string().max(120)).default(''),
  message: text(10, 2000, 'Write at least 10 characters.'),
  // Honeypot: real people never fill this in.
  website: z.string().max(0, 'Rejected.').optional().default(''),
});

export const publicContactRouter = Router();

publicContactRouter.post(
  '/',
  contactLimiter,
  validate(messageSchema),
  asyncHandler(async (req, res) => {
    const { name, email, subject, message } = req.body as z.infer<typeof messageSchema>;
    await prisma.contactMessage.create({
      data: { name, email, subject, message, ip: clientIp(req) },
    });
    res.status(201).json(ok({ received: true }));
  }),
);

export const adminContactRouter = Router();
adminContactRouter.use(isAuthenticated, hasRole('ADMIN', 'EDITOR'));

adminContactRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [messages, unread] = await Promise.all([
      prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.contactMessage.count({ where: { readAt: null } }),
    ]);
    res.json(ok({ messages, unread }));
  }),
);

adminContactRouter.patch(
  '/:id/read',
  csrfProtection,
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const found = await prisma.contactMessage.findUnique({ where: { id } });
    if (!found) throw AppError.notFound('This message no longer exists.');
    const message = await prisma.contactMessage.update({
      where: { id },
      data: { readAt: found.readAt ? null : new Date() },
    });
    res.json(ok({ message }));
  }),
);

adminContactRouter.delete(
  '/:id',
  csrfProtection,
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const found = await prisma.contactMessage.findUnique({ where: { id } });
    if (!found) throw AppError.notFound('This message no longer exists.');
    await prisma.contactMessage.delete({ where: { id } });
    res.json(ok({ deleted: true }));
  }),
);
