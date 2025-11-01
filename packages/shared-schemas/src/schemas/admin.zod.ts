/**
 * Zod validation schemas for the admin schema tables
 */

import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './admin';
import { z } from 'zod';

// ============================================================================
// ADMIN USERS TABLE SCHEMAS
// ============================================================================

/**
 * Base schemas generated from Drizzle table
 */
export const insertAdminUserSchema = createInsertSchema(users);
export const selectAdminUserSchema = createSelectSchema(users);

/**
 * Login request schema
 * Used when admin attempts to authenticate
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Registration request schema
 * Used when creating a new admin user
 */
export const registerAdminSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

/**
 * Update admin user schema (for profile updates)
 * Password and email changes should be separate operations for security
 */
export const updateAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  isActive: z.boolean().optional(),
});

/**
 * Change password schema
 * Requires current password for verification
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

/**
 * Response type for login - includes JWT token
 */
export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.number(),
    email: z.string(),
    name: z.string(),
    isActive: z.boolean(),
  }),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterAdminRequest = z.infer<typeof registerAdminSchema>;
export type UpdateAdminRequest = z.infer<typeof updateAdminSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
