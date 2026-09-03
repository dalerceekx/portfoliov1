import { apiRequest } from '../api/client';
import type { AdminSettings, AdminSocialLink, PublicSettings } from '../types';

export const settingsService = {
  getPublic: (signal?: AbortSignal) =>
    apiRequest<{ settings: PublicSettings }>('/settings', { signal }).then((d) => d.settings),

  getAdmin: (signal?: AbortSignal) =>
    apiRequest<{ settings: AdminSettings; socialLinks: AdminSocialLink[] }>('/admin/settings', {
      signal,
    }),

  update: (body: Record<string, unknown>) =>
    apiRequest<{ settings: AdminSettings }>('/admin/settings', { method: 'PATCH', body }).then(
      (d) => d.settings,
    ),

  createSocialLink: (body: Record<string, unknown>) =>
    apiRequest<{ socialLink: AdminSocialLink }>('/admin/settings/social-links', {
      method: 'POST',
      body,
    }).then((d) => d.socialLink),

  updateSocialLink: (id: string, body: Record<string, unknown>) =>
    apiRequest<{ socialLink: AdminSocialLink }>(`/admin/settings/social-links/${id}`, {
      method: 'PATCH',
      body,
    }).then((d) => d.socialLink),

  removeSocialLink: (id: string) =>
    apiRequest<{ deleted: true }>(`/admin/settings/social-links/${id}`, { method: 'DELETE' }),

  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest<{ path: string }>('/admin/uploads', { method: 'POST', formData }).then(
      (d) => d.path,
    );
  },
};
