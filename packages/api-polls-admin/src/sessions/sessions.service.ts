import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { sessions } from 'shared-schemas/src/schemas/polls';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

/**
 * Type definitions for session operations
 * These are automatically inferred from the Drizzle schema
 */
type Session = InferSelectModel<typeof sessions>;
type NewSession = InferInsertModel<typeof sessions>;

/**
 * SessionsService handles all business logic for poll sessions
 * 
 * @Injectable() makes this class available for dependency injection.
 * Other classes can request this service in their constructor.
 * 
 * This service:
 * - Creates new poll sessions with configuration
 * - Retrieves sessions (all or by ID)
 * - Updates existing sessions
 * - Deletes sessions
 */
@Injectable()
export class SessionsService {
  /**
   * Constructor with dependency injection
   * 
   * @Inject(DATABASE_CONNECTION) tells NestJS to inject the database
   * that we set up in DatabaseModule.
   * 
   * The 'private' keyword makes it available as this.db throughout the class
   */
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: ReturnType<typeof drizzle>,
  ) { }

  /**
   * Create a new poll session
   * 
   * @param sessionData - The session configuration and metadata
   * @returns The newly created session with its ID
   */
  async create(sessionData: NewSession): Promise<Session> {
    const [session] = await this.db
      .insert(sessions)
      .values(sessionData)
      .returning();

    return session;
  }

  /**
   * Get all sessions
   * 
   * @returns Array of all sessions in the database
   */
  async findAll(): Promise<Session[]> {
    return await this.db.select().from(sessions);
  }

  /**
   * Get a specific session by ID
   * 
   * @param id - The session ID
   * @returns The session if found
   * @throws NotFoundException if session doesn't exist
   */
  async findOne(id: number): Promise<Session> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id));

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    return session;
  }

  /**
   * Update an existing session
   * 
   * @param id - The session ID to update
   * @param sessionData - The new data (partial update allowed)
   * @returns The updated session
   * @throws NotFoundException if session doesn't exist
   */
  async update(id: number, sessionData: Partial<NewSession>): Promise<Session> {
    // First check if session exists
    await this.findOne(id);

    const [updatedSession] = await this.db
      .update(sessions)
      .set(sessionData)
      .where(eq(sessions.id, id))
      .returning();

    return updatedSession;
  }

  /**
   * Delete a session
   * 
   * @param id - The session ID to delete
   * @throws NotFoundException if session doesn't exist
   */
  async remove(id: number): Promise<void> {
    // First check if session exists
    await this.findOne(id);

    await this.db
      .delete(sessions)
      .where(eq(sessions.id, id));
  }
}
