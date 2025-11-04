import { Injectable, Inject, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { users } from 'shared-schemas/src/schemas/admin';
import { PasswordService } from 'shared-auth';
import type { RegisterAdminRequest, AdminUserSafe } from 'shared-schemas';

/**
 * AuthService handles database operations for authentication
 * 
 * Following the standard NestJS pattern, this service ONLY handles:
 * - Database queries for users
 * - Password hashing/verification
 * 
 * It does NOT handle:
 * - JWT token generation (that's in the controller)
 * - Request/response logic (that's in the controller)
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: ReturnType<typeof drizzle>,
    private passwordService: PasswordService,
  ) { }

  /**
   * Validate user credentials
   * 
   * Used by LocalStrategy during login.
   * Returns the user if credentials are valid, null otherwise.
   * Throws UnauthorizedException for deactivated accounts with specific message.
   * 
   * @param email - User's email
   * @param password - Plain text password to verify
   * @returns User object if valid, null if invalid
   * @throws UnauthorizedException if account is deactivated
   */
  async validateUser(email: string, password: string): Promise<AdminUserSafe | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      return null;
    }

    // Check if user is active - throw specific error for deactivated accounts
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.comparePasswords(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return null;
    }

    // Update last login timestamp
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Return user without password hash
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Create a new admin user
   * 
   * @param registerData - Email, name, and password
   * @returns Created user (without password hash)
   * @throws ConflictException if email already exists
   */
  async createUser(registerData: RegisterAdminRequest): Promise<AdminUserSafe> {
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

    // Return user without password hash
    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  /**
   * Find user by ID
   * 
   * Used by JwtStrategy and profile endpoint.
   * 
   * @param userId - User's ID
   * @returns User profile data
   * @throws NotFoundException if user doesn't exist
   */
  async findById(userId: number): Promise<AdminUserSafe> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}
