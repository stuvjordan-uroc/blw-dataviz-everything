import { Injectable, Inject } from "@nestjs/common";
import { drizzle } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../database/database.providers";
import { SubmitResponsesDto } from "./responses.controller";
import { respondents, responses as responsesTable } from "shared-schemas";

/**
 * ResponsesService handles business logic for submitting responses
 */
@Injectable()
export class ResponsesService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: ReturnType<typeof drizzle>
  ) {}

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
    // Use a transaction to ensure both respondent and responses are inserted atomically
    const result = await this.db.transaction(async (tx) => {
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
