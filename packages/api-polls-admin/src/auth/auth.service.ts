import { Injectable, Inject, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { users } from 'shared-schemas/src/schemas/admin';
import { PasswordService, JwtPayload } from 'shared-auth';
import type { LoginRequest, RegisterAdminRequest, LoginResponse, AdminUserSafe } from 'shared-schemas';

/**
 * AuthService handles authentication logic
 * 
 * Responsibilities:
 * - Validate user credentials during login
 * - Create new admin users (registration)
 * - Generate JWT tokens
 * - Update last login timestamp
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: ReturnType<typeof drizzle>,
    private jwtService: JwtService,
    private passwordService: PasswordService,
  ) { }

  /**
   * Authenticate a user and return a JWT token
   * 
   * @param loginData - Email and password from login form
   * @returns Access token and safe user data
   * @throws UnauthorizedException if credentials are invalid
   */
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    // Find user by email
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, loginData.email));

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.comparePasswords(
      loginData.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login timestamp
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    // Return token and safe user data (no password hash)
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
      },
    };
  }

  /**
   * Register a new admin user
   * 
   * @param registerData - Email, name, and password
   * @returns Access token and safe user data
   * @throws ConflictException if email already exists
   */
  async register(registerData: RegisterAdminRequest): Promise<LoginResponse> {
    // Check if email already exists
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, registerData.email));

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash the password
    const passwordHash = await this.passwordService.hashPassword(registerData.password);

    // Create the user
    const [newUser] = await this.db
      .insert(users)
      .values({
        email: registerData.email,
        name: registerData.name,
        passwordHash,
      })
      .returning();

    // Generate JWT token for the new user
    const payload: JwtPayload = {
      sub: newUser.id,
      email: newUser.email,
    };

    const accessToken = this.jwtService.sign(payload);

    // Return token and safe user data (no password hash)
    return {
      accessToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        isActive: newUser.isActive,
      },
    };
  }

  /**
   * Get current user profile
   * 
   * @param userId - ID from JWT token
   * @returns User profile data
   */
  async getProfile(userId: number): Promise<AdminUserSafe> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}
