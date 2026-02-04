#!/usr/bin/env tsx
/**
 * Delete the dev test session
 * 
 * Usage: npm run dev:delete-session
 * 
 * This script:
 * 1. Authenticates with admin credentials
 * 2. Fetches the dev-test session
 * 3. Deletes it and all associated data
 */

import type { LoginResponse, SessionResponse } from 'shared-types';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3003';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const FIXED_TEST_SLUG = 'dev-test';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set');
  console.error('   Set these in your .env file');
  process.exit(1);
}

/**
 * Login and get JWT token
 */
async function login(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const data = await response.json() as LoginResponse;
  return data.accessToken;
}

/**
 * Get session by slug to find its ID
 */
async function getSessionBySlug(slug: string): Promise<{ id: number } | null> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${slug}`);

  if (response.ok) {
    const sessionData = await response.json() as SessionResponse;
    return { id: sessionData.id };
  }

  if (response.status === 404) {
    return null;
  }

  throw new Error(`Unexpected error fetching session: ${response.statusText}`);
}

/**
 * Delete session by ID
 */
async function deleteSession(token: string, id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/admin/sessions/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete session: ${response.statusText}\n${error}`);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔍 Looking for dev test session...');
    const session = await getSessionBySlug(FIXED_TEST_SLUG);

    if (!session) {
      console.log('✅ No dev test session found - nothing to delete');
      return;
    }

    console.log(`📋 Found session (ID: ${session.id})`);
    console.log('🔐 Authenticating...');

    const token = await login();
    console.log('✅ Authenticated successfully\n');

    console.log('🗑️  Deleting session...');
    await deleteSession(token, session.id);
    console.log('✅ Session deleted successfully!\n');

    console.log('💡 Run `npm run dev:create-session` to create a fresh test session');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
