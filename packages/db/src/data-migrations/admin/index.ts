/**
 * Admin schema data migrations
 * 
 * These migrations populate the admin.users table and related data.
 * Most admin migrations are environment-aware and skip in production.
 */

import { migration as seedDevAdmin } from './0001_seed_dev_admin';

export const adminMigrations = [
  seedDevAdmin,
];
