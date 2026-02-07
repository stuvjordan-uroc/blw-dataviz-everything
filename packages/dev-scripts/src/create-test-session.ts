#!/usr/bin/env tsx
/**
 * Create a test polling session with democratic characteristics questions
 * 
 * Usage: npm run create-session
 * 
 * This script:
 * 1. Checks if dev test session already exists (idempotent)
 * 2. If not, authenticates with admin credentials and creates it
 * 3. Outputs the session slug for use with simulate-responses.ts
 */

import type { CreateSessionDto, Session, LoginResponse } from 'shared-types';

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
 * Check if a session already exists by slug (uses public API, no auth required)
 */
async function checkSessionExists(slug: string): Promise<Session | null> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${slug}`);

  if (response.ok) {
    const sessionData = await response.json() as { id: number; slug: string; isOpen: boolean; description: string };
    return {
      id: sessionData.id,
      slug: sessionData.slug,
      isOpen: sessionData.isOpen,
      description: sessionData.description,
      createdAt: new Date(),
      sessionConfig: null,
    };
  }

  if (response.status === 404) {
    return null;
  }

  throw new Error(`Unexpected error checking session: ${response.statusText}`);
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
 * Create a test session with democratic characteristics questions
 */
async function createTestSession(token: string, slug: string): Promise<Session> {
  // Define a simple test session with democratic characteristics
  // These questions should already exist in the questions.questions table from seeding
  const sessionConfig: CreateSessionDto = {
    description: 'Test Session - Democratic Characteristics',
    slug, // Use the fixed slug to prevent duplicates
    sessionConfig: {
      questionOrder: [
        {
          varName: 'candidates_disclose',
          batteryName: 'democratic_characteristics_importance',
          subBattery: 'Electoral competition and political accountability',
          responseIndices: [1, 2, 3], // Filter: exclude "Not relevant" (index 0)
        },
        {
          varName: 'legislature_check',
          batteryName: 'democratic_characteristics_importance',
          subBattery: 'Executive, legislative, and judicial powers',
          responseIndices: [3, 2, 1, 0], // Reorder: reverse the responses
        },
        {
          varName: 'ban_ideology',
          batteryName: 'democratic_characteristics_importance',
          subBattery: 'Political and civil rights',
          responseIndices: [0, 1, 2, 3], // Baseline: all responses in order
        },
      ],
      visualizations: [
        {
          responseQuestion: {
            question: {
              varName: 'candidates_disclose',
              batteryName: 'democratic_characteristics_importance',
              subBattery: 'Electoral competition and political accountability',
            },
            responseGroups: {
              expanded: [
                { values: [1], label: 'Beneficial' },
                { values: [2], label: 'Important' },
                { values: [3], label: 'Essential' }
              ],
              collapsed: [
                { values: [1], label: 'Beneficial' },
                { values: [2, 3], label: 'Important/Essential' },
              ],
            },
          },
          groupingQuestions: {
            x: [],
            y: [],
          },
          minGroupAvailableWidth: 100,
          minGroupHeight: 100,
          groupGapX: 10,
          groupGapY: 10,
          responseGap: 5,
          baseSegmentWidth: 10,
          images: {
            circleRadius: 8,
            baseColorRange: ['#a5d6a7', '#1b5e20'],
            groupColorOverrides: [],
          },
        },
        {
          responseQuestion: {
            question: {
              varName: 'legislature_check',
              batteryName: 'democratic_characteristics_importance',
              subBattery: 'Executive, legislative, and judicial powers',
            },
            responseGroups: {
              expanded: [
                { values: [0], label: 'Not relevant' },
                { values: [1], label: 'Beneficial' },
                { values: [2], label: 'Important' },
                { values: [3], label: 'Essential' }
              ],
              collapsed: [
                { values: [0, 1], label: 'Not relevant/Beneficial' },
                { values: [2, 3], label: 'Important/Essential' },
              ],
            },
          },
          groupingQuestions: {
            x: [],
            y: [],
          },
          minGroupAvailableWidth: 100,
          minGroupHeight: 100,
          groupGapX: 10,
          groupGapY: 10,
          responseGap: 5,
          baseSegmentWidth: 10,
          images: {
            circleRadius: 8,
            baseColorRange: ['#a5d6a7', '#1b5e20'],
            groupColorOverrides: [],
          },
        },
        {
          responseQuestion: {
            question: {
              varName: 'ban_ideology',
              batteryName: 'democratic_characteristics_importance',
              subBattery: 'Political and civil rights',
            },
            responseGroups: {
              expanded: [
                { values: [0], label: 'Not relevant' },
                { values: [1], label: 'Beneficial' },
                { values: [2], label: 'Important' },
                { values: [3], label: 'Essential' }
              ],
              collapsed: [
                { values: [0, 1], label: 'Not relevant/Beneficial' },
                { values: [2, 3], label: 'Important/Essential' },
              ],
            },
          },
          groupingQuestions: {
            x: [],
            y: [],
          },
          minGroupAvailableWidth: 100,
          minGroupHeight: 100,
          groupGapX: 10,
          groupGapY: 10,
          responseGap: 5,
          baseSegmentWidth: 10,
          images: {
            circleRadius: 8,
            baseColorRange: ['#a5d6a7', '#1b5e20'],
            groupColorOverrides: [],
          },
        }
      ],
    },
  };

  const response = await fetch(`${API_BASE_URL}/api/admin/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(sessionConfig),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create session: ${response.statusText}\n${error}`);
  }

  return await response.json() as Session;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('� Checking for existing test session...');
    const existingSession = await checkSessionExists(FIXED_TEST_SLUG);

    let session: Session;

    if (existingSession) {
      console.log('✅ Found existing test session\n');
      session = existingSession;
    } else {
      console.log('❌ No existing session found');
      console.log('🔐 Authenticating...');
      const token = await login();
      console.log('✅ Authenticated successfully\n');

      console.log('🌱 Creating test session...');
      session = await createTestSession(token, FIXED_TEST_SLUG);
      console.log('✅ Session created successfully!\n');
    }

    console.log('📋 Session Details:');
    console.log(`   ID: ${session.id}`);
    console.log(`   Slug: ${session.slug}`);
    console.log(`   Description: ${session.description}`);
    console.log(`   Status: ${session.isOpen ? 'Open' : 'Closed'}`);
    console.log('');
    console.log(`🌐 Access URL: http://localhost:3000/polls/${session.slug}`);
    console.log('');
    console.log(`💡 Next step: Run simulate-responses.ts with this slug:`);
    console.log(`   npm run simulate ${session.slug} 10`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
