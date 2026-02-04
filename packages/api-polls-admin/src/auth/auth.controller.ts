import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard, CurrentUser, JwtPayload } from 'shared-auth';
import { registerAdminSchema } from 'shared-schemas';
import type { RegisterAdminRequest, LoginResponse, AdminUserSafe } from 'shared-schemas';

/**
 * AuthController handles authentication endpoints
 * 
 * Routes:
 * - POST /auth/login      - Authenticate and get JWT token
 * - POST /auth/register   - Create new admin user
 * - GET  /auth/profile    - Get current user profile (protected)
 */
@Controller('admin/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) { }

  /**
   * POST /auth/login
   * Authenticate admin user and return JWT token
   * 
   * Uses LocalAuthGuard which:
   * 1. Extracts email/password from request body
   * 2. Validates credentials via LocalStrategy
   * 3. Attaches user to request.user
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
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(@Request() req): Promise<LoginResponse> {
    // LocalAuthGuard has already validated credentials and attached user to req.user
    const user = req.user as AdminUserSafe;

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
    };
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
  ): Promise<LoginResponse> {
    // Create user in database
    const user = await this.authService.createUser(registerData);

    // Generate JWT token for the new user
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
    };
  }

  /**
   * GET /auth/profile
   * Get current authenticated user's profile
   * 
   * Protected by JwtAuthGuard - requires valid JWT token in Authorization header.
   * The @CurrentUser() decorator extracts the user data from the JWT payload.
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
  async getProfile(@CurrentUser('userId') userId: number): Promise<AdminUserSafe> {
    return await this.authService.findById(userId);
  }
}
