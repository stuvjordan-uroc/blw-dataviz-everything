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
import { insertSessionSchema } from 'shared-schemas/src/schemas/polls.zod';
import type { InferInsertModel } from 'drizzle-orm';
import { sessions } from 'shared-schemas/src/schemas/polls';

type NewSession = InferInsertModel<typeof sessions>;

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
 * - @Put() - Handle PUT requests (update data)
 * - @Delete() - Handle DELETE requests (remove data)
 * - @Body() - Extract request body
 * - @Param() - Extract URL parameters
 * 
 * Routes defined:
 * - POST   /sessions           - Create new session
 * - GET    /sessions           - Get all sessions
 * - GET    /sessions/:id       - Get specific session
 * - PUT    /sessions/:id       - Update session
 * - DELETE /sessions/:id       - Delete session
 */
@Controller('sessions')
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
    @Body(new ZodValidationPipe(insertSessionSchema)) sessionData: NewSession,
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
   * PUT /sessions/:id
   * Update an existing session
   * 
   * For partial updates, we use a modified version of the insert schema
   * that makes all fields optional
   * 
   * Example: PUT /sessions/5
   * Body: { "description": "Updated description" }
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(insertSessionSchema.partial())) sessionData: Partial<NewSession>,
  ) {
    return await this.sessionsService.update(id, sessionData);
  }

  /**
   * DELETE /sessions/:id
   * Delete a session
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
