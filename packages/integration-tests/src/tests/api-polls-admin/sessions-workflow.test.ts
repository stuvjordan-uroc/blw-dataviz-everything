import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { setupTestDatabase, TestDbConnection } from '../../utils/test-db';
import { createTestApp, closeTestApp } from '../../utils/test-app';
import { seedTestAdminUser, seedTestQuestions } from '../../utils/test-helpers';

/**
 * Integration Tests: Poll Session Workflow
 * 
 * These tests verify the complete workflow of creating and managing a poll session,
 * following the expected production usage pattern:
 * 
 * 1. Admin authenticates
 * 2. Admin creates a new poll session with configuration
 * 3. [TODO] Admin closes session.
 * 4. [TODO] Admin re-opens closed session.
 * 
 * This test suite focuses on the realistic end-to-end flow rather than
 * testing individual endpoints in isolation.
 */

describe('Poll Session Workflow (Integration)', () => {
  let app: INestApplication;
  let testDbConnection: TestDbConnection;
  let authToken: string;
  let adminUserId: number;

  // Setup: Run once before all tests in this suite
  beforeAll(async () => {
    // Setup test database and run migrations
    testDbConnection = await setupTestDatabase();

    // Create NestJS app instance with test database
    const testApp = await createTestApp(testDbConnection.db);
    app = testApp.app;

    // Step 1: Create and authenticate an admin user
    const { password } = await seedTestAdminUser(
      testDbConnection.db,
      'admin@polling.com',
      'SecurePassword123'
    );

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@polling.com',
        password: password,
      })
      .expect(200);

    authToken = loginResponse.body.accessToken;
    adminUserId = loginResponse.body.user.id;

    // Seed questions that will be available for sessions
    await seedTestQuestions(testDbConnection.db);
  });

  // Cleanup: Run once after all tests complete
  afterAll(async () => {
    await closeTestApp(app);
    await testDbConnection.cleanup();
  });

  // Clean session data between tests
  afterEach(async () => {
    await testDbConnection.db.execute(`
      TRUNCATE TABLE 
        "polls"."responses",
        "polls"."respondents",
        "polls"."questions",
        "polls"."sessions"
      CASCADE
    `);
  });

  describe('Complete Workflow: Admin Creates and Manages Poll Session', () => {
    it('should complete steps 1-2: authenticate and create session', async () => {
      // Step 1: Authentication (already done in beforeAll, verify token works)
      expect(authToken).toBeDefined();
      expect(adminUserId).toBeDefined();

      // Step 2: Create a new poll session with configuration
      const sessionConfig = {
        responseQuestions: [
          {
            varName: 'q1',
            batteryName: 'test_battery',
            subBattery: '', // Empty string for questions without sub-battery
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
            varName: 'q2',
            batteryName: 'test_battery',
            subBattery: '', // Empty string for questions without sub-battery
            responseGroups: [
              { label: 'Group A', values: [1] },
              { label: 'Group B', values: [2] }
            ]
          }
        ]
      };

      const createSessionResponse = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'November 2025 Test Poll',
          sessionConfig: sessionConfig
        })
        .expect(201);

      // Verify session was created with correct structure
      expect(createSessionResponse.body).toHaveProperty('id');
      expect(createSessionResponse.body).toHaveProperty('slug');
      expect(createSessionResponse.body.slug).toMatch(/^[a-z0-9]{10}$/); // 10-char alphanumeric
      expect(createSessionResponse.body.description).toBe('November 2025 Test Poll');
      expect(createSessionResponse.body.sessionConfig).toEqual(sessionConfig);
      expect(createSessionResponse.body).toHaveProperty('createdAt');

      const sessionId = createSessionResponse.body.id;
    });

    it('should populate polls.questions when a valid session is created', async () => {
      // Create a session with 2 questions (1 response question, 1 grouping question)
      const sessionConfig = {
        responseQuestions: [
          {
            varName: 'q1',
            batteryName: 'test_battery',
            subBattery: '',
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
            varName: 'q2',
            batteryName: 'test_battery',
            subBattery: '',
            responseGroups: [
              { label: 'Group A', values: [1] },
              { label: 'Group B', values: [2] }
            ]
          }
        ]
      };

      const createSessionResponse = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Test Session for Questions Population',
          sessionConfig: sessionConfig
        })
        .expect(201);

      const sessionId = createSessionResponse.body.id;

      // Verify that polls.questions was populated with the questions from the session config
      const pollsQuestions = await testDbConnection.db.execute(
        `SELECT * FROM polls.questions WHERE "sessionId" = ${sessionId} ORDER BY "varName"`
      );

      // Should have 2 questions (q1 and q2)
      expect(pollsQuestions.length).toBe(2);

      // Define the expected shape of a poll question row
      interface PollQuestion {
        id: number;
        sessionId: number;
        varName: string;
        batteryName: string;
        subBattery: string;
      }

      // Verify q1 details
      const q1 = pollsQuestions.find(q => (q as unknown as PollQuestion).varName === 'q1') as unknown as PollQuestion | undefined;
      expect(q1).toBeDefined();
      if (q1) {
        expect(q1.sessionId).toBe(sessionId);
        expect(q1.batteryName).toBe('test_battery');
        expect(q1.subBattery).toBe('');
      }

      // Verify q2 details
      const q2 = pollsQuestions.find(q => (q as unknown as PollQuestion).varName === 'q2') as unknown as PollQuestion | undefined;
      expect(q2).toBeDefined();
      if (q2) {
        expect(q2.sessionId).toBe(sessionId);
        expect(q2.batteryName).toBe('test_battery');
        expect(q2.subBattery).toBe('');
      }
      // Verify foreign key constraint is satisfied (questions exist in questions.questions)
      const questionsBankCheck = await testDbConnection.db.execute(
        `SELECT * FROM questions.questions 
         WHERE ("varName", "batteryName", "subBattery") IN (
           ('q1', 'test_battery', ''),
           ('q2', 'test_battery', '')
         )`
      );
      expect(questionsBankCheck.length).toBe(2);
    });

    it('should require authentication for session creation', async () => {
      await request(app.getHttpServer())
        .post('/sessions')
        .send({
          description: 'Unauthorized Poll',
          sessionConfig: { responseQuestions: [], groupingQuestions: [] }
        })
        .expect(401);
    });

    it('should validate session config structure', async () => {
      // Invalid config (missing required fields)
      const invalidResponse = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Invalid Poll',
          sessionConfig: {
            // Missing responseQuestions and groupingQuestions
            invalidField: 'test'
          }
        })
        .expect(400);

      expect(invalidResponse.body.message).toMatch(/validation/i);
    });
  });

  describe('Session Management Operations', () => {
    let sessionId: number;

    beforeEach(async () => {
      // Create a session for testing management operations
      const response = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Test Session for Management',
          sessionConfig: {
            responseQuestions: [
              {
                varName: 'q1',
                batteryName: 'test_battery',
                subBattery: '',
                responseGroups: {
                  expanded: [{ label: 'Yes', values: [1] }, { label: 'No', values: [2] }],
                  collapsed: [{ label: 'All', values: [1, 2] }]
                }
              }
            ],
            groupingQuestions: []
          }
        });

      sessionId = response.body.id;
    });

    it('should retrieve all sessions', async () => {
      const response = await request(app.getHttpServer())
        .get('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('description');
      expect(response.body[0]).toHaveProperty('sessionConfig');
    });

    it('should retrieve a specific session by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: sessionId,
        description: 'Test Session for Management'
      });
    });

    it('should delete a session and cascade to all related data', async () => {
      await request(app.getHttpServer())
        .delete(`/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify session is gone
      await request(app.getHttpServer())
        .get(`/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Verify in database that session is deleted
      const result = await testDbConnection.db.execute(`
        SELECT * FROM "polls"."sessions" WHERE id = ${sessionId}
      `);
      expect(result.length).toBe(0);

      // Verify associated questions are also deleted
      const questionsResult = await testDbConnection.db.execute(`
        SELECT * FROM "polls"."questions" WHERE "sessionId" = ${sessionId}
      `);
      expect(questionsResult.length).toBe(0);
    });

    it('should return 404 for non-existent session', async () => {
      const nonExistentId = 99999;

      await request(app.getHttpServer())
        .get(`/sessions/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Session Status Management', () => {
    let sessionId: number;

    beforeEach(async () => {
      // Create a session for testing status toggling
      const response = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Test Session for Status Toggle',
          sessionConfig: {
            responseQuestions: [
              {
                varName: 'q1',
                batteryName: 'test_battery',
                subBattery: '',
                responseGroups: {
                  expanded: [{ label: 'Yes', values: [1] }, { label: 'No', values: [2] }],
                  collapsed: [{ label: 'All', values: [1, 2] }]
                }
              }
            ],
            groupingQuestions: []
          }
        });

      sessionId = response.body.id;
    });

    it('should create session as open by default', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.isOpen).toBe(true);
    });

    it('should toggle session from open to closed', async () => {
      const response = await request(app.getHttpServer())
        .put(`/sessions/${sessionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isOpen: false })
        .expect(200);

      expect(response.body.isOpen).toBe(false);
      expect(response.body.id).toBe(sessionId);

      // Verify in database
      const getResponse = await request(app.getHttpServer())
        .get(`/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.isOpen).toBe(false);
    });

    it('should toggle session from closed to open', async () => {
      // First close it
      await request(app.getHttpServer())
        .put(`/sessions/${sessionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isOpen: false })
        .expect(200);

      // Then reopen it
      const response = await request(app.getHttpServer())
        .put(`/sessions/${sessionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isOpen: true })
        .expect(200);

      expect(response.body.isOpen).toBe(true);
    });

    it('should require authentication to toggle status', async () => {
      await request(app.getHttpServer())
        .put(`/sessions/${sessionId}/status`)
        .send({ isOpen: false })
        .expect(401);
    });

    it('should validate isOpen field is boolean', async () => {
      const response = await request(app.getHttpServer())
        .put(`/sessions/${sessionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isOpen: 'not a boolean' })
        .expect(400);

      expect(response.body.message).toMatch(/validation/i);
    });

    it('should return 404 when toggling non-existent session', async () => {
      await request(app.getHttpServer())
        .put('/sessions/99999/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isOpen: false })
        .expect(404);
    });
  });

  describe('Session Configuration Validation', () => {
    it('should accept valid session with multiple questions', async () => {
      const complexConfig = {
        responseQuestions: [
          {
            varName: 'q1',
            batteryName: 'test_battery',
            subBattery: '', // Empty string for questions without sub-battery
            responseGroups: {
              expanded: [
                { label: '18-24', values: [1] },
                { label: '25-34', values: [2] },
                { label: '35-44', values: [3] },
                { label: '45+', values: [4] }
              ],
              collapsed: [
                { label: 'Young (18-34)', values: [1, 2] },
                { label: 'Older (35+)', values: [3, 4] }
              ]
            }
          }
        ],
        groupingQuestions: [
          {
            varName: 'q2',
            batteryName: 'test_battery',
            subBattery: '', // Empty string for questions without sub-battery
            responseGroups: [
              { label: 'Northeast', values: [1] },
              { label: 'South', values: [2] },
              { label: 'Midwest', values: [3] },
              { label: 'West', values: [4] }
            ]
          }
        ]
      };

      const response = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Complex Multi-Question Poll',
          sessionConfig: complexConfig
        })
        .expect(201);

      expect(response.body.sessionConfig).toEqual(complexConfig);
    });
  });
});
