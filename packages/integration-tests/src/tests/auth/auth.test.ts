import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { setupTestDatabase, TestDbConnection, cleanTables } from '../../utils/test-db';
import { createTestApp, closeTestApp } from '../../utils/test-app';
import { seedTestAdminUser } from '../../utils/test-helpers';

/**
 * Integration Tests: Auth Endpoints
 * 
 * These tests verify that authentication endpoints work correctly with the database:
 * - POST /auth/register - Create new admin user
 * - POST /auth/login - Authenticate and get JWT
 * - GET /auth/profile - Get current user profile (protected route)
 * 
 * Test Strategy:
 * - Start with a clean test database
 * - Make HTTP requests to the API
 * - Verify responses and database state
 * - Clean up between tests
 */

describe('Auth Endpoints (Integration)', () => {
  let app: INestApplication;
  let testDbConnection: TestDbConnection;

  // Setup: Run once before all tests in this suite
  beforeAll(async () => {
    // Setup test database and run migrations
    testDbConnection = await setupTestDatabase();

    // Create NestJS app instance with test database
    const testApp = await createTestApp(testDbConnection.db);
    app = testApp.app;
  });

  // Cleanup: Run after each test to ensure clean state
  afterEach(async () => {
    await cleanTables(testDbConnection.db, ['admin.users']);
  });

  // Cleanup: Run once after all tests complete
  afterAll(async () => {
    await closeTestApp(app);
    await testDbConnection.cleanup();
  });

  // Clean data between tests for isolation
  afterEach(async () => {
    await testDbConnection.db.execute(`
      TRUNCATE TABLE "admin"."users" CASCADE
    `);
  });

  describe('POST /auth/register', () => {
    it('should create a new admin user and return access token', async () => {
      const registerData = {
        email: 'newadmin@example.com',
        name: 'New Admin',
        password: 'SecurePassword123!',
      };

      const response = await request(app.getHttpServer())
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
      const [user] = await testDbConnection.db.execute(`
        SELECT id, email, name, is_active 
        FROM "admin"."users" 
        WHERE email = '${registerData.email}'
      `);
      expect(user).toBeDefined();
    });

    it('should reject registration with duplicate email', async () => {
      // First registration
      const firstResponse = await request(app.getHttpServer())
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
      const response = await request(app.getHttpServer())
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
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          name: 'Test User',
          password: 'password123',
        })
        .expect(400); // Bad Request
    });

    it('should reject weak password', async () => {
      await request(app.getHttpServer())
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
      // Seed a test user
      const { password } = await seedTestAdminUser(
        testDbConnection.db,
        'testuser@example.com',
        'TestPassword123'
      );

      const response = await request(app.getHttpServer())
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
      const [user] = await testDbConnection.db.execute(`
        SELECT last_login_at FROM "admin"."users" WHERE email = 'testuser@example.com'
      `);
      expect(user.last_login_at).toBeTruthy();
    });

    it('should reject invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401); // Unauthorized

      expect(response.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject invalid password', async () => {
      await seedTestAdminUser(testDbConnection.db, 'user@example.com', 'CorrectPassword');

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject deactivated user', async () => {
      // Create user
      const { password } = await seedTestAdminUser(testDbConnection.db);

      // Deactivate user
      await testDbConnection.db.execute(`
        UPDATE "admin"."users" SET is_active = false
      `);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: password,
        })
        .expect(401);

      expect(response.body.message).toMatch(/deactivated/i);
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile with valid JWT', async () => {
      // Create user and login
      const { password } = await seedTestAdminUser(testDbConnection.db);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: password,
        });

      const token = loginResponse.body.accessToken;

      // Get profile with token
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
      });
      expect(response.body).toHaveProperty('id');
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });
});
