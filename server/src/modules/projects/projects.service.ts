import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/http';
import { uniqueSlug } from '../../utils/slug';
import type { CreateProjectInput, UpdateProjectInput } from './projects.schema';

/** Columns the public site is allowed to see. Draft rows never leave the server. */
const publicSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  url: true,
  image: true,
  icon: true,
  category: true,
  tags: true,
  status: true,
  featured: true,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

export async function listPublicProjects(filter: { category?: string; featured?: boolean }) {
  return prisma.project.findMany({
    where: {
      published: true,
      ...(filter.category && filter.category !== 'All' ? { category: filter.category } : {}),
      ...(filter.featured !== undefined ? { featured: filter.featured } : {}),
    },
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
    select: publicSelect,
  });
}

export const listAdminProjects = () =>
  prisma.project.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });

export async function getAdminProject(id: string) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw AppError.notFound('This project no longer exists.');
  return project;
}

const slugTaken = (ignoreId?: string) => async (slug: string) => {
  const found = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  return Boolean(found && found.id !== ignoreId);
};

export async function createProject(input: CreateProjectInput) {
  const slug = await uniqueSlug(input.slug || input.title, slugTaken());
  return prisma.project.create({
    data: {
      ...input,
      slug,
      url: input.url || null,
      image: input.image || null,
      icon: input.icon || null,
    },
  });
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  const current = await getAdminProject(id);
  const data: Prisma.ProjectUpdateInput = { ...input };

  // A blank slug field means "derive it from the title again", never "clear it":
  // an empty slug would break every public link to the project.
  if (input.slug !== undefined || input.title !== undefined) {
    const base = input.slug || input.title || current.title;
    data.slug = await uniqueSlug(base, slugTaken(id));
  }
  if (input.url !== undefined) data.url = input.url || null;
  if (input.image !== undefined) data.image = input.image || null;
  if (input.icon !== undefined) data.icon = input.icon || null;

  return prisma.project.update({ where: { id }, data });
}

export async function deleteProject(id: string) {
  await getAdminProject(id);
  await prisma.project.delete({ where: { id } });
}

export async function reorderProjects(items: { id: string; sortOrder: number }[]) {
  await prisma.$transaction(
    items.map((item) =>
      prisma.project.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } }),
    ),
  );
}

export async function projectStats() {
  const [total, published, featured, latest] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { published: true } }),
    prisma.project.count({ where: { featured: true } }),
    prisma.project.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
  ]);
  return { total, published, drafts: total - published, featured, lastUpdated: latest?.updatedAt ?? null };
}

export async function listCategories() {
  const rows = await prisma.project.findMany({
    where: { published: true },
    distinct: ['category'],
    select: { category: true },
    orderBy: { category: 'asc' },
  });
  return rows.map((r) => r.category);
}
