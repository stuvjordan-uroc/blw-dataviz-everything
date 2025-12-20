/**
 * Integration Tests: Session Status Toggle
 * Tests the PUT /sessions/:id/status endpoint for toggling session open/closed status
 */

import request from 'supertest';
import { eq } from 'drizzle-orm';
import {
  getTestDb,
  getAdminApiUrl,
  seedTestQuestions,
  cleanTestQuestions,
  seedExistingSession,
  cleanExistingSessions,
} from '../../utils/test-helpers';
import { sessions } from 'shared-schemas';
import { existingOpenSession, existingClosedSession } from '../../fixtures/test-sessions';

describe('Session Status Toggle API', () => {
  const adminApiUrl = getAdminApiUrl();
  let authToken: string;
  let dbCleanup: () => Promise<void>;

  beforeAll(async () => {
    const { db, cleanup } = getTestDb();
    dbCleanup = cleanup;

    // Seed test questions (required for session creation)
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

    // Clean up sessions and test questions
    await cleanExistingSessions(db);
    await cleanTestQuestions(db);

    // Close database connections
    await cleanup();
    await dbCleanup();
  });

  describe('PUT /sessions/:id/status', () => {
    it('should toggle an open session to closed', async () => {
      const { db, cleanup } = getTestDb();

      try {
        // Seed an open session
        const session = await seedExistingSession(db, existingOpenSession);

        // Toggle status to closed
        const response = await request(adminApiUrl)
          .put(`/sessions/${session.id}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isOpen: false });

        // Verify response status
        expect(response.status).toBe(200);

        // Verify response body contains updated session
        expect(response.body.id).toBe(session.id);
        expect(response.body.isOpen).toBe(false);
        expect(response.body.slug).toBe(session.slug);

        // Verify database was updated
        const [updatedSession] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, session.id));

        expect(updatedSession).toBeDefined();
        expect(updatedSession.isOpen).toBe(false);
      } finally {
        await cleanup();
      }
    });

    it('should toggle a closed session to open', async () => {
      const { db, cleanup } = getTestDb();

      try {
        // Seed a closed session
        const session = await seedExistingSession(db, existingClosedSession);

        // Toggle status to open
        const response = await request(adminApiUrl)
          .put(`/sessions/${session.id}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isOpen: true });

        // Verify response status
        expect(response.status).toBe(200);

        // Verify response body contains updated session
        expect(response.body.id).toBe(session.id);
        expect(response.body.isOpen).toBe(true);
        expect(response.body.slug).toBe(session.slug);

        // Verify database was updated
        const [updatedSession] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, session.id));

        expect(updatedSession).toBeDefined();
        expect(updatedSession.isOpen).toBe(true);
      } finally {
        await cleanup();
      }
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(adminApiUrl)
        .put('/sessions/99999/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isOpen: false });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Session with ID 99999 not found');
    });

    it('should reject request without isOpen field', async () => {
      const { db, cleanup } = getTestDb();

      try {
        // Seed a session
        const session = await seedExistingSession(db, existingOpenSession);

        // Send request without isOpen field
        const response = await request(adminApiUrl)
          .put(`/sessions/${session.id}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(400);
      } finally {
        await cleanup();
      }
    });

    it('should reject request with invalid isOpen value', async () => {
      const { db, cleanup } = getTestDb();

      try {
        // Seed a session
        const session = await seedExistingSession(db, existingOpenSession);

        // Send request with invalid isOpen value
        const response = await request(adminApiUrl)
          .put(`/sessions/${session.id}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isOpen: 'not-a-boolean' });

        expect(response.status).toBe(400);
      } finally {
        await cleanup();
      }
    });
  });
});
