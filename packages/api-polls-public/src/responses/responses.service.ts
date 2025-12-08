import { Injectable, Inject, BadRequestException } from "@nestjs/common";
import { drizzle } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../database/database.providers";
import { SubmitResponsesDto } from "./responses.controller";
import { respondents, responses as responsesTable, sessions, outboxEvents } from "shared-schemas";
import { responseSubmittedSchema } from "shared-broker";
import { eq } from "drizzle-orm";

/**
 * ResponsesService handles business logic for submitting responses
 */
@Injectable()
export class ResponsesService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: ReturnType<typeof drizzle>
  ) { }

  /**
   * Submit responses for a single respondent in a session
   *
   * @param sessionId - The ID of the session
   * @param responses - Array of response objects from one respondent
   * @returns Confirmation object with respondent ID
   */
  async submitResponsesForRespondent(
    sessionId: number,
    responses: SubmitResponsesDto
  ) {
    // Use a transaction to ensure we check session.isOpen and insert atomically
    const result = await this.db.transaction(async (tx) => {
      // Ensure session exists and is open
      const [sessionRow] = await tx.select().from(sessions).where(eq(sessions.id, sessionId));
      if (!sessionRow || !sessionRow.isOpen) {
        throw new BadRequestException('Session is closed or not found');
      }

      // Create a new respondent record in polls.respondents table
      const [newRespondent] = await tx
        .insert(respondents)
        .values({ sessionId })
        .returning({ id: respondents.id });

      const respondentId = newRespondent.id;

      // Insert all responses into polls.responses table
      // Map each response to include the respondentId
      const responseValues = responses.map((r) => ({
        respondentId,
        questionSessionId: r.questionSessionId,
        response: r.response,
      }));

      await tx.insert(responsesTable).values(responseValues);

      // Enqueue an outbox event so workers can process this respondent.
      const respPayload = {
        sessionId,
        respondentId,
        createdAt: new Date().toISOString(),
      };

      responseSubmittedSchema.parse(respPayload);

      await tx.insert(outboxEvents).values({
        aggregateType: "session",
        aggregateId: sessionId,
        eventType: "response.submitted",
        payload: respPayload,
      });

      return {
        respondentId,
        responseCount: responses.length,
      };
    });

    return {
      message: "Responses received",
      sessionId,
      respondentId: result.respondentId,
      responseCount: result.responseCount,
    };
  }
}
