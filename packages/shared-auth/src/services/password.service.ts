import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * PasswordService provides password hashing and verification utilities
 * 
 * Uses bcrypt with a salt round of 10 (industry standard for security vs. performance)
 * 
 * Usage:
 * - hashPassword(): When creating or changing passwords
 * - comparePasswords(): When validating login attempts
 */
@Injectable()
export class PasswordService {
  private readonly saltRounds = 10;

  /**
   * Hash a plain text password
   * 
   * @param password - Plain text password from user
   * @returns Bcrypt hashed password suitable for database storage
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Compare a plain text password with a hashed password
   * 
   * @param password - Plain text password from login attempt
   * @param hashedPassword - Hashed password from database
   * @returns true if passwords match, false otherwise
   */
  async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
