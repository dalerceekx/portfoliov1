import { apiRequest } from '../api/client';
import type { AdminProject, PublicProject } from '../types';

export const projectService = {
  listPublic: (signal?: AbortSignal) =>
    apiRequest<{ projects: PublicProject[] }>('/projects', { signal }).then((d) => d.projects),

  listAdmin: (signal?: AbortSignal) =>
    apiRequest<{ projects: AdminProject[] }>('/admin/projects', { signal }).then((d) => d.projects),

  get: (id: string, signal?: AbortSignal) =>
    apiRequest<{ project: AdminProject }>(`/admin/projects/${id}`, { signal }).then((d) => d.project),

  create: (body: Record<string, unknown>) =>
    apiRequest<{ project: AdminProject }>('/admin/projects', { method: 'POST', body }).then(
      (d) => d.project,
    ),

  update: (id: string, body: Record<string, unknown>) =>
    apiRequest<{ project: AdminProject }>(`/admin/projects/${id}`, { method: 'PATCH', body }).then(
      (d) => d.project,
    ),

  remove: (id: string) => apiRequest<{ deleted: true }>(`/admin/projects/${id}`, { method: 'DELETE' }),

  reorder: (items: { id: string; sortOrder: number }[]) =>
    apiRequest<{ reordered: true }>('/admin/projects/reorder', { method: 'PATCH', body: { items } }),
};
