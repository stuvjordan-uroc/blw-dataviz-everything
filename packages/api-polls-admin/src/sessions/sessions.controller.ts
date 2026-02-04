import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from 'shared-auth';
import { CreateSessionDtoSchema } from 'shared-types';
import { z } from 'zod';
import type { CreateSessionDto } from 'shared-types';

// Schema for toggling session status
const toggleStatusSchema = z.object({
  isOpen: z.boolean(),
});

/**
 * SessionsController handles HTTP requests for session management
 * 
 * All endpoints are protected with JwtAuthGuard - requires valid JWT token
 * 
 * @Controller('sessions') sets the base route to /sessions
 * All routes in this controller will start with /sessions
 * 
 * Decorators used:
 * - @UseGuards(JwtAuthGuard) - Requires authentication
 * - @Get() - Handle GET requests (retrieve data)
 * - @Post() - Handle POST requests (create data)
 * - @Put() - Handle PUT requests (update session status only)
 * - @Delete() - Handle DELETE requests (remove data)
 * - @Body() - Extract request body
 * - @Param() - Extract URL parameters
 * 
 * Routes defined:
 * - POST   /sessions           - Create new session
 * - GET    /sessions           - Get all sessions
 * - GET    /sessions/:id       - Get specific session
 * - PUT    /sessions/:id/status - Toggle session open/closed status
 * - DELETE /sessions/:id       - Delete session (cascades to all related data)
 */
@Controller('admin/sessions')
@UseGuards(JwtAuthGuard) // Protect all routes in this controller
export class SessionsController {
  /**
   * Constructor with dependency injection
   * The SessionsService is automatically injected by NestJS
   */
  constructor(private readonly sessionsService: SessionsService) { }

  /**
   * POST /sessions
   * Create a new poll session
   * 
   * @Body() extracts the request body
   * new ZodValidationPipe(insertSessionSchema) validates it against the Zod schema
   * 
   * Example request body:
   * {
   *   "description": "November 2025 Poll",
   *   "sessionConfig": {
   *     "responseQuestions": [...],
   *     "groupingQuestions": [...]
   *   }
   * }
   */
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateSessionDtoSchema)) sessionData: CreateSessionDto,
  ) {
    return await this.sessionsService.create(sessionData);
  }

  /**
   * GET /sessions
   * Retrieve all sessions
   */
  @Get()
  async findAll() {
    return await this.sessionsService.findAll();
  }

  /**
   * GET /sessions/:id
   * Retrieve a specific session by ID
   * 
   * @Param('id', ParseIntPipe) extracts 'id' from URL and converts it to a number
   * ParseIntPipe automatically validates that id is a valid integer
   * 
   * Example: GET /sessions/5
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.sessionsService.findOne(id);
  }

  /**
   * PUT /sessions/:id/status
   * Toggle session status between open and closed
   * 
   * This is the ONLY update allowed on a session - changing its open/closed status.
   * All other session properties are immutable after creation.
   * 
   * Example: PUT /sessions/5/status
   * Body: { "isOpen": false }
   */
  @Put(':id/status')
  async toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(toggleStatusSchema)) body: { isOpen: boolean },
  ) {
    return await this.sessionsService.toggleStatus(id, body.isOpen);
  }

  /**
   * DELETE /sessions/:id
   * Delete a session and all associated data
   * 
   * Cascades delete to all related tables:
   * - polls.session_statistics
   * - polls.responses
   * - polls.respondents
   * - polls.questions
   * 
   * @HttpCode(HttpStatus.NO_CONTENT) sets response status to 204
   * This is the standard status for successful deletion with no response body
   * 
   * Example: DELETE /sessions/5
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.sessionsService.remove(id);
  }
}
