import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PasswordService, JwtStrategy } from 'shared-auth';

/**
 * AuthModule provides authentication functionality
 * 
 * Configures:
 * - Passport for authentication strategies
 * - JWT module for token generation/validation
 * - Password hashing service
 * - JWT strategy for protecting routes
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
    JwtStrategy, // Register the JWT strategy from shared-auth
  ],
  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule { }
