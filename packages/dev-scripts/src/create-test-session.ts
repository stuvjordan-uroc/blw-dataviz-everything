#!/usr/bin/env tsx
/**
 * Create a test polling session with democratic characteristics questions
 * 
 * Usage: npm run create-session
 * 
 * This script:
 * 1. Authenticates with admin credentials
 * 2. Creates a session with democratic characteristics questions
 * 3. Outputs the session slug for use with simulate-responses.ts
 */

import type { CreateSessionDto } from 'shared-types';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3003';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'stuart.jordan@rochester.edu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'turnsOut0BrightLines!';

interface LoginResponse {
  access_token: string;
}

interface CreateSessionResponse {
  id: number;
  slug: string;
  isOpen: boolean;
  description: string;
}

/**
 * Login and get JWT token
 */
async function login(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
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
  return data.access_token;
}

/**
 * Create a test session with democratic characteristics questions
 */
async function createTestSession(token: string): Promise<CreateSessionResponse> {
  // Define a simple test session with democratic characteristics
  // These questions should already exist in the questions.questions table from seeding
  const sessionConfig: CreateSessionDto = {
    description: 'Test Session - Democratic Characteristics',
    sessionConfig: {
      questionOrder: [
        {
          varName: 'candidates_disclose',
          batteryName: 'democratic_characteristics_importance',
          subBattery: 'Electoral competition and political accountability',
        },
        {
          varName: 'legislature_check',
          batteryName: 'democratic_characteristics_importance',
          subBattery: 'Executive, legislative, and judicial powers',
        },
        {
          varName: 'ban_ideology',
          batteryName: 'democratic_characteristics_importance',
          subBattery: 'Political and civil rights',
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
                { values: [0], label: 'Not essential' },
                { values: [1], label: 'Important but not essential' },
                { values: [2], label: 'Essential' },
              ],
              collapsed: [
                { values: [0], label: 'Not essential' },
                { values: [1, 2], label: 'Important/Essential' },
              ],
            },
          },
          groupingQuestions: {
            x: [],
            y: [],
          },
          minGroupAvailableWidth: 800,
          minGroupHeight: 600,
          groupGapX: 50,
          groupGapY: 50,
          responseGap: 10,
          baseSegmentWidth: 30,
          images: {
            circleRadius: 8,
            baseColorRange: ['#ff6b6b', '#4ecdc4'],
            groupColorOverrides: [],
          },
        },
      ],
    },
  };

  const response = await fetch(`${API_BASE_URL}/admin/sessions`, {
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

  return await response.json() as CreateSessionResponse;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔐 Authenticating...');
    const token = await login();
    console.log('✅ Authenticated successfully\n');

    console.log('🌱 Creating test session...');
    const session = await createTestSession(token);
    console.log('✅ Session created successfully!\n');

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
