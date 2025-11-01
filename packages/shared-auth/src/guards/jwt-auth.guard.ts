import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard protects routes by requiring a valid JWT token
 * 
 * Usage in controllers:
 * @UseGuards(JwtAuthGuard)
 * @Get('protected-route')
 * myProtectedRoute(@CurrentUser() user) {
 *   // Only accessible with valid JWT
 *   // user contains { userId, email } from JWT
 * }
 * 
 * This guard:
 * 1. Extracts JWT from Authorization header
 * 2. Validates signature and expiration
 * 3. Calls JwtStrategy.validate()
 * 4. Attaches user to request if valid
 * 5. Returns 401 Unauthorized if invalid/missing
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Call the parent AuthGuard's canActivate method
    // This triggers the JWT strategy validation
    return super.canActivate(context);
  }
}
