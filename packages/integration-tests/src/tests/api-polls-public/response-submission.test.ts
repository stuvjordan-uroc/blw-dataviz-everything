/**
 * Integration Tests: Response Submission
 * Tests the POST /responses endpoint using real HTTP requests
 */

import request from 'supertest';
import { eq } from 'drizzle-orm';
import { questions, responses } from 'shared-schemas';
import type { Question } from 'shared-types';
import {
  getTestDb,
  getAdminApiUrl,
  getPublicApiUrl,
  cleanSessionData,
} from '../../utils/test-helpers';

describe('Response Submission API', () => {
  const adminApiUrl = getAdminApiUrl();
  const publicApiUrl = getPublicApiUrl();

  let authToken: string;
  let sessionId: number;
  let responseQuestionKey: Question;
  let groupingQuestionKey: Question;

  beforeAll(async () => {
    const { db, cleanup } = getTestDb();

    try {
      // Get questions using Drizzle query builder
      const allQuestions = await db
        .select()
        .from(questions)
        .limit(2);

      if (allQuestions.length < 2) {
        throw new Error('Need at least 2 questions in database');
      }

      responseQuestionKey = {
        varName: allQuestions[0].varName,
        batteryName: allQuestions[0].batteryName,
        subBattery: allQuestions[0].subBattery,
      };

      groupingQuestionKey = {
        varName: allQuestions[1].varName,
        batteryName: allQuestions[1].batteryName,
        subBattery: allQuestions[1].subBattery,
      };

      // Authenticate
      const loginResponse = await request(adminApiUrl)
        .post('/auth/login')
        .send({
          email: process.env.INITIAL_ADMIN_EMAIL || 'admin@dev.local',
          password: process.env.INITIAL_ADMIN_PASSWORD || 'dev-password-changeme',
        })
        .expect(200);

      authToken = loginResponse.body.accessToken;

      // Create session using actual schema
      const sessionResponse = await request(adminApiUrl)
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Test Session for Response Submission',
          sessionConfig: {
            questionOrder: [
              responseQuestionKey,
              groupingQuestionKey,
            ],
            visualizations: [
              {
                responseQuestion: {
                  question: responseQuestionKey,
                  responseGroups: {
                    expanded: [
                      { label: 'Option 1', values: [0] },
                      { label: 'Option 2', values: [1] },
                    ],
                    collapsed: [
                      { label: 'All', values: [0, 1] },
                    ],
                  },
                },
                groupingQuestions: {
                  x: [
                    {
                      question: groupingQuestionKey,
                      responseGroups: [
                        { label: 'Group A', values: [0] },
                        { label: 'Group B', values: [1] },
                      ],
                    },
                  ],
                  y: [],
                },
                minGroupAvailableWidth: 200,
                minGroupHeight: 200,
                groupGapX: 10,
                groupGapY: 10,
                responseGap: 5,
                baseSegmentWidth: 50,
              },
            ],
          },
        });

      if (sessionResponse.status !== 201) {
        console.error('Session creation failed:', sessionResponse.status, sessionResponse.body);
        throw new Error(`Failed to create session: ${JSON.stringify(sessionResponse.body)}`);
      }

      sessionId = sessionResponse.body.id;
      console.log(`Created test session ${sessionId}`);
    } finally {
      await cleanup();
    }
  });

  afterAll(async () => {
    // Delete session
    if (sessionId && authToken) {
      await request(adminApiUrl)
        .delete(`/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    }

    // Clean up database
    const { db, cleanup } = getTestDb();
    try {
      await cleanSessionData(db);
    } finally {
      await cleanup();
    }
  });

  test('should accept valid response submission', async () => {
    const response = await request(publicApiUrl)
      .post('/responses')
      .send({
        sessionId,
        answers: [
          {
            varName: responseQuestionKey.varName,
            batteryName: responseQuestionKey.batteryName,
            subBattery: responseQuestionKey.subBattery,
            responseIndex: 0,
          },
          {
            varName: groupingQuestionKey.varName,
            batteryName: groupingQuestionKey.batteryName,
            subBattery: groupingQuestionKey.subBattery,
            responseIndex: 1,
          },
        ],
      })
      .expect(201);

    expect(response.body).toHaveProperty('respondentId');
    expect(typeof response.body.respondentId).toBe('number');
  });

  test('should persist response to database', async () => {
    const submitResponse = await request(publicApiUrl)
      .post('/responses')
      .send({
        sessionId,
        answers: [
          {
            varName: responseQuestionKey.varName,
            batteryName: responseQuestionKey.batteryName,
            subBattery: responseQuestionKey.subBattery,
            responseIndex: 2,
          },
        ],
      })
      .expect(201);

    const respondentId = submitResponse.body.respondentId;

    // Check database using Drizzle
    const { db, cleanup } = getTestDb();
    try {
      const dbResponses = await db
        .select()
        .from(responses)
        .where(eq(responses.respondentId, respondentId));

      expect(dbResponses.length).toBeGreaterThan(0);
    } finally {
      await cleanup();
    }
  });

  test('should reject responses for non-existent session', async () => {
    const response = await request(publicApiUrl)
      .post('/responses')
      .send({
        sessionId: 999999,
        answers: [
          {
            varName: responseQuestionKey.varName,
            batteryName: responseQuestionKey.batteryName,
            subBattery: responseQuestionKey.subBattery,
            responseIndex: 0,
          },
        ],
      })
      .expect(404);

    expect(response.body.message).toContain('999999');
  });
});
