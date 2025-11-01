/**
 * Shared authentication utilities for NestJS APIs
 * 
 * Export all authentication-related components:
 * - Services: Password hashing
 * - Strategies: JWT validation
 * - Guards: Route protection
 * - Decorators: User extraction
 */

// Services
export { PasswordService } from './services/password.service';

// Strategies
export { JwtStrategy, JwtPayload } from './strategies/jwt.strategy';

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';

// Decorators
export { CurrentUser } from './decorators/current-user.decorator';
