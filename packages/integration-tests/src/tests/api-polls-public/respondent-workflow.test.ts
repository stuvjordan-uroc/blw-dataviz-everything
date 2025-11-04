import request from 'supertest';
import { sql } from 'drizzle-orm';
import {
  getTestDb,
  cleanSessionData
} from '../../utils/test-helpers';

/**
 * Integration Tests: API Polls Public - Questions Endpoint
 * 
 * These tests verify the public API endpoint for retrieving session questions
 * against the containerized API service.
 * 
 * Prerequisites:
 * 1. Test environment must be running: npm run test:up
 * 2. Test database must be populated: npm run test:db-populate
 *    - This creates the admin user from INITIAL_ADMIN_EMAIL/INITIAL_ADMIN_PASSWORD env vars
 *    - This creates real questions from data migrations
 * 
 * Test Flow:
 * 1. Setup: Admin authenticates and creates a poll session (via api-polls-admin)
 * 2. Tests: Public API retrieves questions for the session (via api-polls-public)
 * 3. Teardown: Session is deleted
 * 
 * This test suite verifies the public-facing API works correctly.
 */

describe('API Polls Public - Questions Endpoint (Integration)', () => {
  const adminApiUrl = process.env.TEST_API_URL || 'http://localhost:3004';
  const publicApiUrl = process.env.TEST_PUBLIC_API_URL || 'http://localhost:3005';

  let authToken: string;
  let sessionId: number;
  let testQuestions: Array<{ varName: string; batteryName: string; subBattery: string }> = [];

  // Setup: Create a test session before all tests
  beforeAll(async () => {
    const { db, cleanup } = getTestDb();

    try {
      // Fetch real questions from the database (seeded by data migrations)
      const questionsResult = await db.execute(sql`
        SELECT "varName", "batteryName", "subBattery"
        FROM questions.questions
        ORDER BY "varName", "batteryName", "subBattery"
        LIMIT 3
      `);

      if (questionsResult.length < 2) {
        throw new Error('Not enough questions in database. Did you run test:db-populate?');
      }

      // Type assertion after validation
      testQuestions = questionsResult.map(q => ({
        varName: (q as Record<string, unknown>).varName as string,
        batteryName: (q as Record<string, unknown>).batteryName as string,
        subBattery: (q as Record<string, unknown>).subBattery as string,
      }));

      // Step 1: Authenticate as admin using the admin created by data migrations
      const loginResponse = await request(adminApiUrl)
        .post('/auth/login')
        .send({
          email: process.env.INITIAL_ADMIN_EMAIL || 'admin@dev.local',
          password: process.env.INITIAL_ADMIN_PASSWORD || 'dev-password-changeme',
        })
        .expect(200);

      authToken = loginResponse.body.accessToken;

      // Step 2: Create a poll session with one response question and one grouping
      const sessionConfig = {
        responseQuestions: [
          {
            varName: testQuestions[0].varName,
            batteryName: testQuestions[0].batteryName,
            subBattery: testQuestions[0].subBattery,
            responseGroups: {
              expanded: [
                { label: 'Yes', values: [1] },
                { label: 'No', values: [2] }
              ],
              collapsed: [
                { label: 'All Responses', values: [1, 2] }
              ]
            }
          }
        ],
        groupingQuestions: [
          {
            varName: testQuestions[1].varName,
            batteryName: testQuestions[1].batteryName,
            subBattery: testQuestions[1].subBattery,
            responseGroups: [
              { label: 'Group A', values: [1] },
              { label: 'Group B', values: [2] }
            ]
          }
        ]
      };

      const createSessionResponse = await request(adminApiUrl)
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Test Session for Public API',
          sessionConfig: sessionConfig
        })
        .expect(201);

      sessionId = createSessionResponse.body.id;

      console.log(`Test session created with ID: ${sessionId}`);
    } finally {
      await cleanup();
    }
  });

  // Teardown: Delete the test session after all tests
  afterAll(async () => {
    if (sessionId && authToken) {
      try {
        // Delete the session via admin API
        await request(adminApiUrl)
          .delete(`/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);

        console.log(`Test session ${sessionId} deleted`);
      } catch (error) {
        console.error('Error deleting test session:', error);
      }
    }

    // Also clean up any remaining session data
    const { db, cleanup } = getTestDb();
    try {
      await cleanSessionData(db);
    } finally {
      await cleanup();
    }
  });

  describe('GET /sessions/:sessionId/questions', () => {
    it('should retrieve all questions for the session', async () => {
      // Make request to public API to get questions for the session
      const response = await request(publicApiUrl)
        .get(`/sessions/${sessionId}/questions`)
        .expect(200);

      // Should return an array of questions
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2); // 1 response question + 1 grouping question

      // Verify both questions are present with correct data
      const returnedQuestions = response.body;

      // Find the response question (first test question)
      const responseQuestion = returnedQuestions.find(
        (q: { varName: string; batteryName: string; subBattery: string }) =>
          q.varName === testQuestions[0].varName &&
          q.batteryName === testQuestions[0].batteryName &&
          q.subBattery === testQuestions[0].subBattery
      );

      expect(responseQuestion).toBeDefined();
      expect(responseQuestion).toHaveProperty('id');
      expect(responseQuestion.sessionId).toBe(sessionId);
      expect(responseQuestion.varName).toBe(testQuestions[0].varName);
      expect(responseQuestion.batteryName).toBe(testQuestions[0].batteryName);
      expect(responseQuestion.subBattery).toBe(testQuestions[0].subBattery);

      // Find the grouping question (second test question)
      const groupingQuestion = returnedQuestions.find(
        (q: { varName: string; batteryName: string; subBattery: string }) =>
          q.varName === testQuestions[1].varName &&
          q.batteryName === testQuestions[1].batteryName &&
          q.subBattery === testQuestions[1].subBattery
      );

      expect(groupingQuestion).toBeDefined();
      expect(groupingQuestion).toHaveProperty('id');
      expect(groupingQuestion.sessionId).toBe(sessionId);
      expect(groupingQuestion.varName).toBe(testQuestions[1].varName);
      expect(groupingQuestion.batteryName).toBe(testQuestions[1].batteryName);
      expect(groupingQuestion.subBattery).toBe(testQuestions[1].subBattery);
    });

    it('should return 404 for non-existent session', async () => {
      const nonExistentSessionId = 99999;

      const response = await request(publicApiUrl)
        .get(`/sessions/${nonExistentSessionId}/questions`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Session');
      expect(response.body.message).toContain('not found');
    });
  });
});
