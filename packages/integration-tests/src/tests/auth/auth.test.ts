import request from 'supertest';
import { sql } from 'drizzle-orm';
import {
  getTestDb,
  getTestApiUrl,
  seedTestAdminUser
} from '../../utils/test-helpers';

/**
 * Integration Tests: Auth Endpoints
 * 
 * These tests verify that authentication endpoints work correctly against the 
 * containerized API service.
 * 
 * Prerequisites:
 * 1. Test environment must be running: npm run test:up
 * 2. Test database must be populated: npm run test:db-populate
 * 
 * Tests cover:
 * - POST /auth/register - Create new admin user
 * - POST /auth/login - Authenticate and get JWT
 * - GET /auth/profile - Get current user profile (protected route)
 * 
 * Test Strategy:
 * - Make HTTP requests to the containerized API
 * - Verify responses and database state
 * - Clean up between tests
 */

describe('Auth Endpoints (Integration)', () => {
  const apiUrl = getTestApiUrl();

  // Clean data between tests for isolation
  afterEach(async () => {
    const { db, cleanup } = getTestDb();
    try {
      await db.execute(sql`TRUNCATE TABLE "admin"."users" CASCADE`);
    } finally {
      await cleanup();
    }
  });

  describe('POST /auth/register', () => {
    it('should create a new admin user and return access token', async () => {
      const { db, cleanup } = getTestDb();

      try {
        const registerData = {
          email: 'newadmin@example.com',
          name: 'New Admin',
          password: 'SecurePassword123!',
        };

        const response = await request(apiUrl)
          .post('/auth/register')
          .send(registerData);

        // Log response for debugging
        if (response.status !== 201) {
          console.log('Register failed:', response.status, response.body);
        }

        expect(response.status).toBe(201);

        // Verify response structure
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toMatchObject({
          email: registerData.email,
          name: registerData.name,
          isActive: true,
        });
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user).not.toHaveProperty('passwordHash');

        // Verify JWT token is valid (basic check)
        expect(response.body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

        // Verify user was created in database
        const [user] = await db.execute(sql`
          SELECT id, email, name, is_active 
          FROM "admin"."users" 
          WHERE email = ${registerData.email}
        `);
        expect(user).toBeDefined();
      } finally {
        await cleanup();
      }
    });

    it('should reject registration with duplicate email', async () => {
      // First registration
      const firstResponse = await request(apiUrl)
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          name: 'First User',
          password: 'Password123',
        });

      if (firstResponse.status !== 201) {
        console.log('First registration failed:', firstResponse.status, firstResponse.body);
      }
      expect(firstResponse.status).toBe(201);

      // Attempt duplicate registration
      const response = await request(apiUrl)
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          name: 'Second User',
          password: 'Password123',
        })
        .expect(409);

      expect(response.body.message).toMatch(/already exists|duplicate|registered/i);
    });

    it('should reject invalid email format', async () => {
      await request(apiUrl)
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          name: 'Test User',
          password: 'password123',
        })
        .expect(400); // Bad Request
    });

    it('should reject weak password', async () => {
      await request(apiUrl)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          password: '123', // Too short
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should authenticate valid credentials and return token', async () => {
      const { db, cleanup } = getTestDb();

      try {
        // Seed a test user
        const { password } = await seedTestAdminUser(
          db,
          'testuser@example.com',
          'TestPassword123'
        );

        const response = await request(apiUrl)
          .post('/auth/login')
          .send({
            email: 'testuser@example.com',
            password: password,
          })
          .expect(200);

        // Verify response
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toMatchObject({
          email: 'testuser@example.com',
          name: 'Test User',
          isActive: true,
        });
        expect(response.body.user).not.toHaveProperty('passwordHash');

        // Verify lastLoginAt was updated
        const [user] = await db.execute(sql`
          SELECT last_login_at FROM "admin"."users" WHERE email = 'testuser@example.com'
        `);
        expect(user.last_login_at).toBeTruthy();
      } finally {
        await cleanup();
      }
    });

    it('should reject invalid email', async () => {
      const response = await request(apiUrl)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401); // Unauthorized

      expect(response.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject invalid password', async () => {
      const { db, cleanup } = getTestDb();

      try {
        await seedTestAdminUser(db, 'user@example.com', 'CorrectPassword');

        const response = await request(apiUrl)
          .post('/auth/login')
          .send({
            email: 'user@example.com',
            password: 'WrongPassword',
          })
          .expect(401);

        expect(response.body.message).toMatch(/invalid email or password/i);
      } finally {
        await cleanup();
      }
    });

    it('should reject deactivated user', async () => {
      const { db, cleanup } = getTestDb();

      try {
        // Create user
        const { password } = await seedTestAdminUser(db);

        // Deactivate user
        await db.execute(sql`
          UPDATE "admin"."users" SET is_active = false
        `);

        const response = await request(apiUrl)
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: password,
          })
          .expect(401);

        expect(response.body.message).toMatch(/deactivated/i);
      } finally {
        await cleanup();
      }
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile with valid JWT', async () => {
      const { db, cleanup } = getTestDb();

      try {
        // Create user and login
        const { password } = await seedTestAdminUser(db);

        const loginResponse = await request(apiUrl)
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: password,
          });

        const token = loginResponse.body.accessToken;

        // Get profile with token
        const response = await request(apiUrl)
          .get('/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body).toMatchObject({
          email: 'test@example.com',
          name: 'Test User',
          isActive: true,
        });
        expect(response.body).toHaveProperty('id');
      } finally {
        await cleanup();
      }
    });

    it('should reject request without token', async () => {
      await request(apiUrl)
        .get('/auth/profile')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(apiUrl)
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });
});

