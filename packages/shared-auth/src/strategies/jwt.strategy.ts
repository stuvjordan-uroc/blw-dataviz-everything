import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * JWT payload structure
 * This is what's stored in the JWT token after login
 */
export interface JwtPayload {
  sub: number;      // User ID (subject)
  email: string;    // User email
  iat?: number;     // Issued at (timestamp)
  exp?: number;     // Expires at (timestamp)
}

/**
 * JwtStrategy validates JWT tokens on protected routes
 * 
 * This is used by Passport to:
 * 1. Extract the JWT from the Authorization header
 * 2. Verify the JWT signature using the secret key
 * 3. Decode the payload and attach it to the request
 * 
 * The validate() method is called automatically when a valid JWT is found.
 * The return value becomes available as req.user in controllers.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Extract JWT from the "Bearer <token>" format in Authorization header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Reject expired tokens
      ignoreExpiration: false,

      // Secret key for verifying JWT signature
      // IMPORTANT: This must match the secret used when creating tokens
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    });
  }

  /**
   * Validate the JWT payload
   * 
   * This method is called after Passport verifies the token signature.
   * The payload has been decoded and verified - we just need to return
   * the user data that should be attached to the request.
   * 
   * @param payload - Decoded JWT payload
   * @returns User data to attach to request (available as req.user)
   */
  async validate(payload: JwtPayload) {
    // Return user info from JWT payload
    // This becomes available in controllers via @CurrentUser() decorator
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
