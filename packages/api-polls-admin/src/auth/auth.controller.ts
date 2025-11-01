import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard, CurrentUser } from 'shared-auth';
import { loginSchema, registerAdminSchema } from 'shared-schemas';
import type { LoginRequest, RegisterAdminRequest } from 'shared-schemas';

/**
 * AuthController handles authentication endpoints
 * 
 * Routes:
 * - POST /auth/login      - Authenticate and get JWT token
 * - POST /auth/register   - Create new admin user
 * - GET  /auth/profile    - Get current user profile (protected)
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  /**
   * POST /auth/login
   * Authenticate admin user and return JWT token
   * 
   * Request body:
   * {
   *   "email": "admin@example.com",
   *   "password": "password123"
   * }
   * 
   * Response:
   * {
   *   "accessToken": "eyJhbGc...",
   *   "user": {
   *     "id": 1,
   *     "email": "admin@example.com",
   *     "name": "Admin User",
   *     "isActive": true
   *   }
   * }
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) loginData: LoginRequest,
  ) {
    return await this.authService.login(loginData);
  }

  /**
   * POST /auth/register
   * Create a new admin user and return JWT token
   * 
   * Request body:
   * {
   *   "email": "newadmin@example.com",
   *   "name": "New Admin",
   *   "password": "SecurePass123"
   * }
   * 
   * Response:
   * {
   *   "accessToken": "eyJhbGc...",
   *   "user": {
   *     "id": 2,
   *     "email": "newadmin@example.com",
   *     "name": "New Admin",
   *     "isActive": true,
   *     "createdAt": "2025-11-01T...",
   *     "updatedAt": "2025-11-01T...",
   *     "lastLoginAt": null
   *   }
   * }
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodValidationPipe(registerAdminSchema)) registerData: RegisterAdminRequest,
  ) {
    return await this.authService.register(registerData);
  }

  /**
   * GET /auth/profile
   * Get current authenticated user's profile
   * 
   * Requires JWT token in Authorization header:
   * Authorization: Bearer eyJhbGc...
   * 
   * Response:
   * {
   *   "id": 1,
   *   "email": "admin@example.com",
   *   "name": "Admin User",
   *   "isActive": true,
   *   "createdAt": "2025-11-01T...",
   *   "lastLoginAt": "2025-11-01T..."
   * }
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser('userId') userId: number) {
    return await this.authService.getProfile(userId);
  }
}
