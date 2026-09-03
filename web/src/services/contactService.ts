import { apiRequest } from '../api/client';
import type { ContactMessage, DashboardStats, LoginLogEntry } from '../types';

export const contactService = {
  send: (body: { name: string; email: string; subject: string; message: string; website: string }) =>
    apiRequest<{ received: true }>('/contact', { method: 'POST', body }),

  list: (signal?: AbortSignal) =>
    apiRequest<{ messages: ContactMessage[]; unread: number }>('/admin/messages', { signal }),

  toggleRead: (id: string) =>
    apiRequest<{ message: ContactMessage }>(`/admin/messages/${id}/read`, { method: 'PATCH' }).then(
      (d) => d.message,
    ),

  remove: (id: string) => apiRequest<{ deleted: true }>(`/admin/messages/${id}`, { method: 'DELETE' }),
};

export const dashboardService = {
  stats: (signal?: AbortSignal) => apiRequest<DashboardStats>('/admin/stats', { signal }),
  loginLogs: (signal?: AbortSignal) =>
    apiRequest<{ logs: LoginLogEntry[] }>('/admin/security/login-logs', { signal }).then(
      (d) => d.logs,
    ),
};
