/**
 * Integration Tests: Session Creation
 * Tests the POST /sessions endpoint for creating new poll sessions
 */

import request from 'supertest';
import { eq } from 'drizzle-orm';
import {
  getTestDb,
  getAdminApiUrl,
  seedTestQuestions,
  cleanTestQuestions,
  cleanSessionData,
} from '../../utils/test-helpers';
import { sessions, pollQuestions, sessionVisualizations } from 'shared-schemas';
import { testQuestions } from '../../fixtures/test-questions';
import { validSessionConfig, invalidSessionConfig } from '../../fixtures/test-session-configs';

describe('Session Creation API', () => {
  const adminApiUrl = getAdminApiUrl();
  let authToken: string;
  let dbCleanup: () => Promise<void>;

  beforeAll(async () => {
    const { db, cleanup } = getTestDb();
    dbCleanup = cleanup;

    // Seed test questions into the database
    await seedTestQuestions(db);

    // Authenticate to get JWT token
    const loginResponse = await request(adminApiUrl)
      .post('/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'changeme123', // From INITIAL_ADMIN_PASSWORD in .env
      });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    const { db, cleanup } = getTestDb();

    // Clean up session data first (due to foreign key constraints)
    await cleanSessionData(db);

    // Clean up test questions
    await cleanTestQuestions(db);

    // Close database connections
    await cleanup();
    await dbCleanup();
  });

  // Test cases will go here
  describe('POST /sessions', () => {
    it('should reject session with questions in visualization but not in questionOrder', async () => {
      const response = await request(adminApiUrl)
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Test session with invalid config',
          sessionConfig: invalidSessionConfig,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('referenced in visualizations but not in questionOrder');
    });

    it('should create a session with valid configuration', async () => {
      const { db, cleanup } = getTestDb();

      try {
        const response = await request(adminApiUrl)
          .post('/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            description: 'Test session with valid config',
            sessionConfig: validSessionConfig,
          });

        // Verify response status is 201 (Created)
        expect(response.status).toBe(201);

        // Verify response body contains the created session
        expect(response.body).toHaveProperty('id');
        expect(typeof response.body.id).toBe('number');
        expect(response.body).toHaveProperty('slug');
        expect(typeof response.body.slug).toBe('string');
        expect(response.body.slug).toHaveLength(10);
        expect(response.body.description).toBe('Test session with valid config');
        expect(response.body.isOpen).toBe(true);
        expect(response.body).toHaveProperty('createdAt');

        // Verify sessionConfig has visualizations with generated IDs
        expect(response.body.sessionConfig).toBeDefined();
        expect(response.body.sessionConfig.questionOrder).toHaveLength(validSessionConfig.questionOrder.length);
        expect(response.body.sessionConfig.visualizations).toHaveLength(1);
        expect(response.body.sessionConfig.visualizations[0]).toHaveProperty('id');
        expect(response.body.sessionConfig.visualizations[0].id).toMatch(/^viz_[a-z0-9]{8}$/);

        const sessionId = response.body.id;
        const visualizationId = response.body.sessionConfig.visualizations[0].id;

        // Query polls.sessions table and verify the row exists
        const [sessionRow] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, sessionId));

        expect(sessionRow).toBeDefined();
        expect(sessionRow.id).toBe(sessionId);
        expect(sessionRow.slug).toBe(response.body.slug);
        expect(sessionRow.description).toBe('Test session with valid config');
        expect(sessionRow.isOpen).toBe(true);
        expect(sessionRow.sessionConfig).toBeDefined();

        // Query polls.questions table and verify correct rows created
        const questionRows = await db
          .select()
          .from(pollQuestions)
          .where(eq(pollQuestions.sessionId, sessionId));

        expect(questionRows).toHaveLength(validSessionConfig.questionOrder.length);

        // Verify each question has correct data
        validSessionConfig.questionOrder.forEach((expectedQuestion, index) => {
          const questionRow = questionRows.find(
            (row) =>
              row.varName === expectedQuestion.varName &&
              row.batteryName === expectedQuestion.batteryName &&
              row.subBattery === expectedQuestion.subBattery
          );

          expect(questionRow).toBeDefined();
          expect(questionRow!.sessionId).toBe(sessionId);
          expect(questionRow!.orderingIndex).toBe(index);
        });

        // Query polls.session_visualizations table and verify
        const [vizRow] = await db
          .select()
          .from(sessionVisualizations)
          .where(eq(sessionVisualizations.sessionId, sessionId));

        expect(vizRow).toBeDefined();
        expect(vizRow.sessionId).toBe(sessionId);
        expect(vizRow.visualizationId).toBe(visualizationId);

        // Verify basisSplitIndices is populated
        expect(vizRow.basisSplitIndices).toBeDefined();
        expect(Array.isArray(vizRow.basisSplitIndices)).toBe(true);
        expect(vizRow.basisSplitIndices!.length).toBeGreaterThan(0);

        // Verify splits is populated
        expect(vizRow.splits).toBeDefined();
        expect(Array.isArray(vizRow.splits)).toBe(true);
        expect(vizRow.splits!.length).toBeGreaterThan(0);

        // Verify lookupMaps is populated
        expect(vizRow.lookupMaps).toBeDefined();
        expect(vizRow.lookupMaps).toHaveProperty('responseIndexToGroupIndex');
        expect(vizRow.lookupMaps).toHaveProperty('profileToSplitIndex');
        expect(typeof vizRow.lookupMaps!.responseIndexToGroupIndex).toBe('object');
        expect(typeof vizRow.lookupMaps!.profileToSplitIndex).toBe('object');
      } finally {
        await cleanup();
      }
    });
  });
});
