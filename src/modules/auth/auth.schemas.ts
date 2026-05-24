import { z } from 'zod';

export const signInSchema = z
  .object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();
export type SignInInput = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z
  .object({
    email: z.string().email().toLowerCase(),
  })
  .strict();
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const passwordPolicy = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const resetPasswordSchema = z
  .object({
    token: z.string().min(16),
    newPassword: passwordPolicy,
  })
  .strict();
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: z.enum(['superAdmin', 'hospitalAdmin']),
  hospitalId: z.string().nullable(),
  status: z.enum(['active', 'locked', 'pendingPasswordSet']),
  mustChangePassword: z.boolean(),
  lastLoginAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserResponse = z.infer<typeof userResponseSchema>;
