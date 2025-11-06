import request from "supertest";
import { sql } from "drizzle-orm";
import {
  getTestDb,
  getTestApiUrl,
  cleanSessionData,
} from "../../utils/test-helpers";

/**
 * Integration Tests: Poll Session Workflow
 *
 * These tests verify the complete workflow of creating and managing a poll session
 * against the containerized API service using real production-like data.
 *
 * Prerequisites:
 * 1. Test environment must be running: npm run test:up
 * 2. Test database must be populated: npm run test:db-populate
 *    - This creates the admin user from INITIAL_ADMIN_EMAIL/INITIAL_ADMIN_PASSWORD env vars
 *    - This creates real questions from data migrations
 *
 * Test Flow:
 * 1. Admin authenticates (using data migration admin)
 * 2. Admin creates a new poll session with configuration (using real questions)
 * 3. Admin manages session status (open/closed)
 * 4. Admin retrieves and deletes sessions
 *
 * This test suite focuses on the realistic end-to-end flow using production data.
 */

describe("Poll Session Workflow (Integration)", () => {
  const apiUrl = getTestApiUrl();
  let authToken: string;
  let adminUserId: number;
  let testQuestions: Array<{
    varName: string;
    batteryName: string;
    subBattery: string;
  }> = [];

  // Setup: Run once before all tests in this suite
  beforeAll(async () => {
    const { db, cleanup } = getTestDb();

    try {
      // Fetch some real questions from the database (seeded by data migrations)
      const questionsResult = await db.execute(sql`
        SELECT "varName", "batteryName", "subBattery"
        FROM questions.questions
        ORDER BY "varName", "batteryName", "subBattery"
        LIMIT 3
      `);

      if (questionsResult.length < 2) {
        throw new Error(
          "Not enough questions in database. Did you run test:db-populate?"
        );
      }

      // Type assertion after validation
      testQuestions = questionsResult.map((q) => ({
        varName: (q as Record<string, unknown>).varName as string,
        batteryName: (q as Record<string, unknown>).batteryName as string,
        subBattery: (q as Record<string, unknown>).subBattery as string,
      }));

      // Authenticate using the admin created by data migrations
      const loginResponse = await request(apiUrl)
        .post("/auth/login")
        .send({
          email: process.env.INITIAL_ADMIN_EMAIL || "admin@dev.local",
          password:
            process.env.INITIAL_ADMIN_PASSWORD || "dev-password-changeme",
        })
        .expect(200);

      authToken = loginResponse.body.accessToken;
      adminUserId = loginResponse.body.user.id;
    } finally {
      await cleanup();
    }
  });

  // Clean session data between tests
  afterEach(async () => {
    const { db, cleanup } = getTestDb();
    try {
      await cleanSessionData(db);
    } finally {
      await cleanup();
    }
  });

  describe("Complete Workflow: Admin Creates and Manages Poll Session", () => {
    it("should complete steps 1-2: authenticate and create session", async () => {
      // Step 1: Authentication (already done in beforeAll, verify token works)
      expect(authToken).toBeDefined();
      expect(adminUserId).toBeDefined();

      // Step 2: Create a new poll session with configuration using real questions
      const sessionConfig = {
        responseQuestions: [
          {
            varName: testQuestions[0].varName,
            batteryName: testQuestions[0].batteryName,
            subBattery: testQuestions[0].subBattery,
            responseGroups: {
              expanded: [
                { label: "Yes", values: [1] },
                { label: "No", values: [2] },
              ],
              collapsed: [{ label: "All Responses", values: [1, 2] }],
            },
          },
        ],
        groupingQuestions: [
          {
            varName: testQuestions[1].varName,
            batteryName: testQuestions[1].batteryName,
            subBattery: testQuestions[1].subBattery,
            responseGroups: [
              { label: "Group A", values: [1] },
              { label: "Group B", values: [2] },
            ],
          },
        ],
      };

      const createSessionResponse = await request(apiUrl)
        .post("/sessions")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          description: "November 2025 Test Poll",
          sessionConfig: sessionConfig,
        })
        .expect(201);

      // Verify session was created with correct structure
      expect(createSessionResponse.body).toHaveProperty("id");
      expect(createSessionResponse.body).toHaveProperty("slug");
      expect(createSessionResponse.body.slug).toMatch(/^[a-z0-9]{10}$/); // 10-char alphanumeric
      expect(createSessionResponse.body.description).toBe(
        "November 2025 Test Poll"
      );
      expect(createSessionResponse.body.sessionConfig).toEqual(sessionConfig);
      expect(createSessionResponse.body).toHaveProperty("createdAt");
    });

    it("should populate polls.questions when a valid session is created", async () => {
      const { db, cleanup } = getTestDb();

      try {
        // Create a session with 2 real questions (1 response question, 1 grouping question)
        const sessionConfig = {
          responseQuestions: [
            {
              varName: testQuestions[0].varName,
              batteryName: testQuestions[0].batteryName,
              subBattery: testQuestions[0].subBattery,
              responseGroups: {
                expanded: [
                  { label: "Yes", values: [1] },
                  { label: "No", values: [2] },
                ],
                collapsed: [{ label: "All Responses", values: [1, 2] }],
              },
            },
          ],
          groupingQuestions: [
            {
              varName: testQuestions[1].varName,
              batteryName: testQuestions[1].batteryName,
              subBattery: testQuestions[1].subBattery,
              responseGroups: [
                { label: "Group A", values: [1] },
                { label: "Group B", values: [2] },
              ],
            },
          ],
        };

        const createSessionResponse = await request(apiUrl)
          .post("/sessions")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            description: "Test Session for Questions Population",
            sessionConfig: sessionConfig,
          })
          .expect(201);

        const sessionId = createSessionResponse.body.id;

        // Verify that polls.questions was populated with the questions from the session config
        const pollsQuestions = await db.execute(sql`
          SELECT * FROM polls.questions 
          WHERE "sessionId" = ${sessionId} 
          ORDER BY "ordering_index"
        `);

        // Should have 2 questions
        expect(pollsQuestions.length).toBe(2);

        // Define the expected shape of a poll question row
        interface PollQuestion {
          id: number;
          sessionId: number;
          varName: string;
          batteryName: string;
          subBattery: string;
          ordering_index: number;
        }

        // Verify first question details (from responseQuestions, should have orderingIndex 0)
        const q1 = pollsQuestions.find((q: unknown) => {
          const pq = q as PollQuestion;
          return (
            pq.varName === testQuestions[0].varName &&
            pq.batteryName === testQuestions[0].batteryName &&
            pq.subBattery === testQuestions[0].subBattery
          );
        }) as PollQuestion | undefined;
        expect(q1).toBeDefined();
        if (q1) {
          expect(q1.sessionId).toBe(sessionId);
          expect(q1.batteryName).toBe(testQuestions[0].batteryName);
          expect(q1.subBattery).toBe(testQuestions[0].subBattery);
          expect(q1.ordering_index).toBe(0); // First question in responseQuestions
        }

        // Verify second question details (from groupingQuestions, should have orderingIndex 1)
        const q2 = pollsQuestions.find((q: unknown) => {
          const pq = q as PollQuestion;
          return (
            pq.varName === testQuestions[1].varName &&
            pq.batteryName === testQuestions[1].batteryName &&
            pq.subBattery === testQuestions[1].subBattery
          );
        }) as PollQuestion | undefined;
        expect(q2).toBeDefined();
        if (q2) {
          expect(q2.sessionId).toBe(sessionId);
          expect(q2.batteryName).toBe(testQuestions[1].batteryName);
          expect(q2.subBattery).toBe(testQuestions[1].subBattery);
          expect(q2.ordering_index).toBe(1); // First question in groupingQuestions (continues from responseQuestions)
        }

        // Verify foreign key constraint is satisfied (questions exist in questions.questions)
        const questionsBankCheck = await db.execute(sql`
          SELECT * FROM questions.questions 
          WHERE ("varName", "batteryName", "subBattery") IN (
            (${testQuestions[0].varName}, ${testQuestions[0].batteryName}, ${testQuestions[0].subBattery}),
            (${testQuestions[1].varName}, ${testQuestions[1].batteryName}, ${testQuestions[1].subBattery})
          )
        `);
        expect(questionsBankCheck.length).toBe(2);
      } finally {
        await cleanup();
      }
    });

    it("should require authentication for session creation", async () => {
      await request(apiUrl)
        .post("/sessions")
        .send({
          description: "Unauthorized Poll",
          sessionConfig: { responseQuestions: [], groupingQuestions: [] },
        })
        .expect(401);
    });

    it("should validate session config structure", async () => {
      // Invalid config (missing required fields)
      const invalidResponse = await request(apiUrl)
        .post("/sessions")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          description: "Invalid Poll",
          sessionConfig: {
            // Missing responseQuestions and groupingQuestions
            invalidField: "test",
          },
        })
        .expect(400);

      expect(invalidResponse.body.message).toMatch(/validation/i);
    });
  });

  describe("Session Management Operations", () => {
    let sessionId: number;

    beforeEach(async () => {
      // Create a session for testing management operations using real question
      const response = await request(apiUrl)
        .post("/sessions")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          description: "Test Session for Management",
          sessionConfig: {
            responseQuestions: [
              {
                varName: testQuestions[0].varName,
                batteryName: testQuestions[0].batteryName,
                subBattery: testQuestions[0].subBattery,
                responseGroups: {
                  expanded: [
                    { label: "Yes", values: [1] },
                    { label: "No", values: [2] },
                  ],
                  collapsed: [{ label: "All", values: [1, 2] }],
                },
              },
            ],
            groupingQuestions: [],
          },
        });

      sessionId = response.body.id;
    });

    it("should retrieve all sessions", async () => {
      const response = await request(apiUrl)
        .get("/sessions")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("description");
      expect(response.body[0]).toHaveProperty("sessionConfig");
    });

    it("should retrieve a specific session by ID", async () => {
      const response = await request(apiUrl)
        .get(`/sessions/${sessionId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: sessionId,
        description: "Test Session for Management",
      });
    });

    it("should delete a session and cascade to all related data", async () => {
      const { db, cleanup } = getTestDb();

      try {
        await request(apiUrl)
          .delete(`/sessions/${sessionId}`)
          .set("Authorization", `Bearer ${authToken}`)
          .expect(204);

        // Verify session is gone
        await request(apiUrl)
          .get(`/sessions/${sessionId}`)
          .set("Authorization", `Bearer ${authToken}`)
          .expect(404);

        // Verify in database that session is deleted
        const result = await db.execute(`
          SELECT * FROM "polls"."sessions" WHERE id = ${sessionId}
        `);
        expect(result.length).toBe(0);

        // Verify associated questions are also deleted
        const questionsResult = await db.execute(`
          SELECT * FROM "polls"."questions" WHERE "sessionId" = ${sessionId}
        `);
        expect(questionsResult.length).toBe(0);
      } finally {
        await cleanup();
      }
    });

    it("should return 404 for non-existent session", async () => {
      const nonExistentId = 99999;

      await request(apiUrl)
        .get(`/sessions/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe("Session Status Management", () => {
    let sessionId: number;

    beforeEach(async () => {
      // Create a session for testing status toggling using real question
      const response = await request(apiUrl)
        .post("/sessions")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          description: "Test Session for Status Toggle",
          sessionConfig: {
            responseQuestions: [
              {
                varName: testQuestions[0].varName,
                batteryName: testQuestions[0].batteryName,
                subBattery: testQuestions[0].subBattery,
                responseGroups: {
                  expanded: [
                    { label: "Yes", values: [1] },
                    { label: "No", values: [2] },
                  ],
                  collapsed: [{ label: "All", values: [1, 2] }],
                },
              },
            ],
            groupingQuestions: [],
          },
        });

      sessionId = response.body.id;
    });

    it("should create session as open by default", async () => {
      const response = await request(apiUrl)
        .get(`/sessions/${sessionId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.isOpen).toBe(true);
    });

    it("should toggle session from open to closed", async () => {
      const response = await request(apiUrl)
        .put(`/sessions/${sessionId}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ isOpen: false })
        .expect(200);

      expect(response.body.isOpen).toBe(false);
      expect(response.body.id).toBe(sessionId);

      // Verify in database
      const getResponse = await request(apiUrl)
        .get(`/sessions/${sessionId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.isOpen).toBe(false);
    });

    it("should toggle session from closed to open", async () => {
      // First close it
      await request(apiUrl)
        .put(`/sessions/${sessionId}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ isOpen: false })
        .expect(200);

      // Then reopen it
      const response = await request(apiUrl)
        .put(`/sessions/${sessionId}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ isOpen: true })
        .expect(200);

      expect(response.body.isOpen).toBe(true);
    });

    it("should require authentication to toggle status", async () => {
      await request(apiUrl)
        .put(`/sessions/${sessionId}/status`)
        .send({ isOpen: false })
        .expect(401);
    });

    it("should validate isOpen field is boolean", async () => {
      const response = await request(apiUrl)
        .put(`/sessions/${sessionId}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ isOpen: "not a boolean" })
        .expect(400);

      expect(response.body.message).toMatch(/validation/i);
    });

    it("should return 404 when toggling non-existent session", async () => {
      await request(apiUrl)
        .put("/sessions/99999/status")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ isOpen: false })
        .expect(404);
    });
  });

  describe("Session Configuration Validation", () => {
    it("should accept valid session with multiple questions and complex groupings", async () => {
      // Use real questions with complex response groupings
      const complexConfig = {
        responseQuestions: [
          {
            varName: testQuestions[0].varName,
            batteryName: testQuestions[0].batteryName,
            subBattery: testQuestions[0].subBattery,
            responseGroups: {
              expanded: [
                { label: "18-24", values: [1] },
                { label: "25-34", values: [2] },
                { label: "35-44", values: [3] },
                { label: "45+", values: [4] },
              ],
              collapsed: [
                { label: "Young (18-34)", values: [1, 2] },
                { label: "Older (35+)", values: [3, 4] },
              ],
            },
          },
        ],
        groupingQuestions: [
          {
            varName: testQuestions[1].varName,
            batteryName: testQuestions[1].batteryName,
            subBattery: testQuestions[1].subBattery,
            responseGroups: [
              { label: "Northeast", values: [1] },
              { label: "South", values: [2] },
              { label: "Midwest", values: [3] },
              { label: "West", values: [4] },
            ],
          },
        ],
      };

      const response = await request(apiUrl)
        .post("/sessions")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          description: "Complex Multi-Question Poll",
          sessionConfig: complexConfig,
        })
        .expect(201);

      expect(response.body.sessionConfig).toEqual(complexConfig);
    });
  });
});
