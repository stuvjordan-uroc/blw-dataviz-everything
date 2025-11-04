import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * LocalAuthGuard protects the login endpoint
 * 
 * This uses the LocalStrategy to validate username/password.
 * When applied to a route, it automatically:
 * 1. Extracts email/password from request body
 * 2. Calls LocalStrategy.validate()
 * 3. Attaches the user to request.user if valid
 * 4. Throws UnauthorizedException if invalid
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') { }
