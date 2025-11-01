import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser decorator extracts the authenticated user from the request
 * 
 * Usage in controllers:
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user) {
 *   console.log(user.userId, user.email);
 * }
 * 
 * You can also extract specific properties:
 * getProfile(@CurrentUser('userId') userId: number) {
 *   console.log(userId);
 * }
 * 
 * The user object comes from JwtStrategy.validate()
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested, return just that
    return data ? user?.[data] : user;
  },
);
