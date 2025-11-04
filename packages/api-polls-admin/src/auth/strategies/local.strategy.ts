import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import type { AdminUserSafe } from 'shared-schemas';

/**
 * LocalStrategy handles username/password authentication
 * 
 * This is the standard NestJS/Passport pattern for login.
 * It validates credentials and returns the authenticated user.
 * 
 * Used by: POST /auth/login with LocalAuthGuard
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // Use 'email' instead of default 'username'
      passwordField: 'password',
    });
  }

  /**
   * Validate user credentials
   * 
   * This method is called automatically by Passport when using LocalAuthGuard.
   * If it returns a user, authentication succeeds.
   * If it returns null/undefined or throws, authentication fails.
   * 
   * @param email - User's email from request body
   * @param password - User's password from request body
   * @returns User object if valid, throws UnauthorizedException if invalid
   */
  async validate(email: string, password: string): Promise<AdminUserSafe> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return user;
  }
}
