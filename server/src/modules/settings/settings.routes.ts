import { Router } from 'express';
import { asyncHandler } from '../../utils/async';
import { ok } from '../../utils/http';
import { validate } from '../../middleware/validate';
import { hasRole, isAuthenticated } from '../../middleware/auth';
import { csrfProtection } from '../../middleware/csrf';
import { socialLinkSchema, updateSettingsSchema, updateSocialLinkSchema } from './settings.schema';
import {
  createSocialLink,
  deleteSocialLink,
  getPublicSettings,
  getSettings,
  listSocialLinks,
  updateSettings,
  updateSocialLink,
} from './settings.service';

export const publicSettingsRouter = Router();

publicSettingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(ok({ settings: await getPublicSettings() }));
  }),
);

export const adminSettingsRouter = Router();
adminSettingsRouter.use(isAuthenticated, hasRole('ADMIN', 'EDITOR'));

adminSettingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(ok({ settings: await getSettings(), socialLinks: await listSocialLinks() }));
  }),
);

adminSettingsRouter.patch(
  '/',
  csrfProtection,
  validate(updateSettingsSchema),
  asyncHandler(async (req, res) => {
    res.json(ok({ settings: await updateSettings(req.body) }));
  }),
);

adminSettingsRouter.post(
  '/social-links',
  csrfProtection,
  validate(socialLinkSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(ok({ socialLink: await createSocialLink(req.body) }));
  }),
);

adminSettingsRouter.patch(
  '/social-links/:id',
  csrfProtection,
  validate(updateSocialLinkSchema),
  asyncHandler(async (req, res) => {
    res.json(ok({ socialLink: await updateSocialLink(req.params.id as string, req.body) }));
  }),
);

adminSettingsRouter.delete(
  '/social-links/:id',
  csrfProtection,
  asyncHandler(async (req, res) => {
    await deleteSocialLink(req.params.id as string);
    res.json(ok({ deleted: true }));
  }),
);
