import { z } from 'zod';
import { isStrongPassword, PASSWORD_RULES } from './password';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  password: z.string().min(1, 'Enter your password.').max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.').max(200),
  newPassword: z.string().max(200).refine(isStrongPassword, PASSWORD_RULES.message),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
