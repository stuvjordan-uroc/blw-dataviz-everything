import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../database/database.providers";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { sessions } from "shared-schemas";
import type { SessionResponse } from "shared-types";
import { ResponsesService } from "../responses/responses.service";

/**
 * SessionsService handles session information retrieval for public clients
 */
@Injectable()
export class SessionsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: ReturnType<typeof drizzle>,
    private responsesService: ResponsesService
  ) { }

  /**
   * Get complete session information by slug
   * 
   * Returns everything a client needs to interact with a session:
   * - Session metadata
   * - Configuration
   * - Current visualization state
   * - API endpoints
   * 
   * @param slug - The session's unique slug
   * @returns Complete session info
   * @throws NotFoundException if session doesn't exist
   */
  async getSessionBySlug(slug: string): Promise<SessionResponse> {
    // Get session by slug
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.slug, slug));

    if (!session) {
      throw new NotFoundException(`Session with slug '${slug}' not found`);
    }

    if (!session.sessionConfig) {
      throw new NotFoundException(`Session ${session.id} has no configuration`);
    }

    // Get current visualization data with viewMaps (static metadata for client-side view switching)
    const visualizations = await this.responsesService.getVisualizationData(session.id, true);

    // Build response with all needed information
    return {
      // Session metadata
      id: session.id,
      slug: session.slug,
      isOpen: session.isOpen,
      description: session.description,
      createdAt: session.createdAt,

      // Session configuration
      config: session.sessionConfig,

      // Current visualization state
      visualizations,

      // API endpoints for client to use
      endpoints: {
        // For submitting responses (if session is open)
        submitResponse: `/sessions/${slug}/responses`,

        // For real-time visualization updates
        visualizationStream: `/visualizations/session/${session.id}/stream`,
      },
    };
  }
}
