import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { PasswordService, JwtStrategy } from 'shared-auth';

/**
 * AuthModule provides authentication functionality
 * 
 * Following the standard NestJS authentication pattern:
 * - LocalStrategy: Validates email/password during login
 * - JwtStrategy: Validates JWT tokens for protected routes
 * - AuthService: Handles database operations
 * - PasswordService: Handles password hashing/verification
 */
@Module({
  imports: [
    // Register Passport with default JWT strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Configure JWT module
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: {
        expiresIn: process.env.JWT_EXPIRATION || '24h',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    LocalStrategy,  // Add LocalStrategy for login
    JwtStrategy,    // JWT strategy from shared-auth
  ],
  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule { }
