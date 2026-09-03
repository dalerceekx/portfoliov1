import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { publicProjectsRouter, adminProjectsRouter } from './modules/projects/projects.routes';
import { publicSettingsRouter, adminSettingsRouter } from './modules/settings/settings.routes';
import { publicContactRouter, adminContactRouter } from './modules/contact/contact.routes';
import { adminSecurityRouter, adminStatsRouter } from './modules/security/security.routes';
import { adminUploadRouter } from './modules/uploads/uploads.routes';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

// Public surface — read-only, minimal fields.
apiRouter.use('/auth', authRouter);
apiRouter.use('/projects', publicProjectsRouter);
apiRouter.use('/settings', publicSettingsRouter);
apiRouter.use('/contact', publicContactRouter);

// Admin surface — every router below re-checks authentication itself.
apiRouter.use('/admin/projects', adminProjectsRouter);
apiRouter.use('/admin/settings', adminSettingsRouter);
apiRouter.use('/admin/messages', adminContactRouter);
apiRouter.use('/admin/security', adminSecurityRouter);
apiRouter.use('/admin/stats', adminStatsRouter);
apiRouter.use('/admin/uploads', adminUploadRouter);
