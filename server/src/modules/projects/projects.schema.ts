import { z } from 'zod';
import { assertSafeImagePath, assertSafeUrl, stripTags } from '../../utils/sanitize';

const plain = (max: number) =>
  z
    .string()
    .transform(stripTags)
    .pipe(z.string().min(1, 'This field is required.').max(max));

/** Blank is allowed: a project with no public link is still a project. */
const safeUrl = z
  .string()
  .trim()
  .max(2048)
  .superRefine((value, ctx) => {
    if (!value) return;
    try {
      assertSafeUrl(value);
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: (e as Error).message });
    }
  });

const safeImage = z
  .string()
  .trim()
  .max(2048)
  .superRefine((value, ctx) => {
    if (!value) return;
    try {
      assertSafeImagePath(value);
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: (e as Error).message });
    }
  });

export const projectStatus = z.enum(['LIVE', 'IN_DEVELOPMENT', 'ARCHIVED']);

export const createProjectSchema = z.object({
  title: plain(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, 'Use lowercase letters, numbers and hyphens only.')
    .optional()
    .default(''),
  description: plain(400),
  url: safeUrl.optional().default(''),
  image: safeImage.optional().default(''),
  icon: z.string().trim().max(40).optional().default(''),
  category: plain(40).default('Other'),
  tags: z.array(z.string().transform(stripTags).pipe(z.string().min(1).max(24))).max(10).default([]),
  status: projectStatus.default('LIVE'),
  published: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const updateProjectSchema = createProjectSchema.partial();

export const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string().cuid(), sortOrder: z.number().int().min(0).max(9999) })).max(200),
});

export const publicQuerySchema = z.object({
  category: z.string().trim().max(40).optional(),
  featured: z.enum(['true', 'false']).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
