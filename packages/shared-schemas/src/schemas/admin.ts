import { pgSchema, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Admin Schema
 * 
 * Contains tables related to administrative users and authentication.
 * Separate from polls and questions schemas for security and organization.
 */

export const adminSchema = pgSchema("admin");

/**
 * Admin Users Table
 * 
 * Stores administrator credentials for the polling system.
 * Passwords are hashed using bcrypt before storage.
 */
export const users = adminSchema.table("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(), // bcrypt hashed password
  isActive: boolean("is_active").notNull().default(true), // Can deactivate without deleting
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"), // Track when admin last logged in
});

// Export type helpers for TypeScript
export type AdminUser = InferSelectModel<typeof users>;
export type AdminUserInsert = InferInsertModel<typeof users>;

// Omit password hash when returning user data
export type AdminUserSafe = Omit<AdminUser, 'passwordHash'>;
