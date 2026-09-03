import { Router } from 'express';
import { asyncHandler } from '../../utils/async';
import { ok } from '../../utils/http';
import { validate } from '../../middleware/validate';
import { isAuthenticated, hasRole } from '../../middleware/auth';
import { csrfProtection } from '../../middleware/csrf';
import {
  createProjectSchema,
  publicQuerySchema,
  reorderSchema,
  updateProjectSchema,
} from './projects.schema';
import {
  createProject,
  deleteProject,
  getAdminProject,
  listAdminProjects,
  listCategories,
  listPublicProjects,
  reorderProjects,
  updateProject,
} from './projects.service';

export const publicProjectsRouter = Router();

publicProjectsRouter.get(
  '/',
  validate(publicQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.query as { category?: string; featured?: 'true' | 'false' };
    const projects = await listPublicProjects({
      category: q.category,
      featured: q.featured === undefined ? undefined : q.featured === 'true',
    });
    res.json(ok({ projects }));
  }),
);

publicProjectsRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    res.json(ok({ categories: await listCategories() }));
  }),
);

export const adminProjectsRouter = Router();

adminProjectsRouter.use(isAuthenticated, hasRole('ADMIN', 'EDITOR'));

adminProjectsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(ok({ projects: await listAdminProjects() }));
  }),
);

adminProjectsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(ok({ project: await getAdminProject(req.params.id as string) }));
  }),
);

adminProjectsRouter.post(
  '/',
  csrfProtection,
  validate(createProjectSchema),
  asyncHandler(async (req, res) => {
    const project = await createProject(req.body);
    res.status(201).json(ok({ project }));
  }),
);

adminProjectsRouter.patch(
  '/reorder',
  csrfProtection,
  validate(reorderSchema),
  asyncHandler(async (req, res) => {
    await reorderProjects(req.body.items);
    res.json(ok({ reordered: true }));
  }),
);

adminProjectsRouter.patch(
  '/:id',
  csrfProtection,
  validate(updateProjectSchema),
  asyncHandler(async (req, res) => {
    const project = await updateProject(req.params.id as string, req.body);
    res.json(ok({ project }));
  }),
);

adminProjectsRouter.delete(
  '/:id',
  csrfProtection,
  asyncHandler(async (req, res) => {
    await deleteProject(req.params.id as string);
    res.json(ok({ deleted: true }));
  }),
);
