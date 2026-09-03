import { apiRequest, setCsrfToken } from '../api/client';
import type { AdminUser } from '../types';

export const authService = {
  login: async (email: string, password: string) => {
    const data = await apiRequest<{ admin: AdminUser; csrfToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setCsrfToken(data.csrfToken);
    return data.admin;
  },

  me: (signal?: AbortSignal) =>
    apiRequest<{ admin: AdminUser }>('/auth/me', { signal }).then((d) => d.admin),

  refresh: async () => {
    const data = await apiRequest<{ admin: AdminUser; csrfToken: string }>('/auth/refresh', {
      method: 'POST',
    });
    setCsrfToken(data.csrfToken);
    return data.admin;
  },

  logout: async () => {
    await apiRequest<{ loggedOut: true }>('/auth/logout', { method: 'POST' });
    setCsrfToken(null);
  },

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ changed: true }>('/auth/password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),
};
