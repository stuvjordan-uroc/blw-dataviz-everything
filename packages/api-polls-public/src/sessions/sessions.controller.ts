import {
  Controller,
  Get,
  Param,
  NotFoundException,
} from "@nestjs/common";
import { SessionsService } from "./sessions.service";

/**
 * SessionsController handles session information retrieval for public clients
 * 
 * This is the main entry point for clients connecting to a polling session.
 * It provides all the information needed to:
 * - Display session details
 * - Render current visualization state
 * - Know which endpoints to use for responses and streaming
 * 
 * Routes:
 * - GET /sessions/:slug - Get complete session info by slug
 */
@Controller("sessions")
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) { }

  /**
   * GET /sessions/:slug
   * Get complete session information by slug
   * 
   * This is the canonical entry point for clients. Returns everything needed:
   * - Session metadata (id, slug, description, isOpen, createdAt)
   * - Session configuration (questions, visualizations)
   * - Current visualization state (splits, basisSplitIndices, etc.)
   * - API endpoints for submitting responses and streaming updates
   * 
   * @param slug - The session's unique slug
   * @returns Complete session info with visualizations and endpoints
   * @throws NotFoundException if session doesn't exist
   */
  @Get(":slug")
  async getSessionBySlug(@Param("slug") slug: string) {
    return await this.sessionsService.getSessionBySlug(slug);
  }
}
