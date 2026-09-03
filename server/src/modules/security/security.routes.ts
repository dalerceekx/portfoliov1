import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../utils/async';
import { ok } from '../../utils/http';
import { hasRole, isAuthenticated } from '../../middleware/auth';
import { projectStats } from '../projects/projects.service';

export const adminSecurityRouter = Router();
adminSecurityRouter.use(isAuthenticated, hasRole('ADMIN'));

adminSecurityRouter.get(
  '/login-logs',
  asyncHandler(async (_req, res) => {
    const logs = await prisma.loginLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        ip: true,
        userAgent: true,
        success: true,
        reason: true,
        createdAt: true,
      },
    });
    res.json(ok({ logs }));
  }),
);

adminSecurityRouter.get(
  '/sessions',
  asyncHandler(async (req, res) => {
    const sessions = await prisma.refreshToken.findMany({
      where: { adminId: req.admin!.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, expiresAt: true },
    });
    res.json(ok({ sessions }));
  }),
);

export const adminStatsRouter = Router();
adminStatsRouter.use(isAuthenticated, hasRole('ADMIN', 'EDITOR'));

adminStatsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [projects, unreadMessages, totalMessages, recentLogins] = await Promise.all([
      projectStats(),
      prisma.contactMessage.count({ where: { readAt: null } }),
      prisma.contactMessage.count(),
      prisma.loginLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, email: true, ip: true, success: true, createdAt: true },
      }),
    ]);
    res.json(ok({ projects, messages: { unread: unreadMessages, total: totalMessages }, recentLogins }));
  }),
);
