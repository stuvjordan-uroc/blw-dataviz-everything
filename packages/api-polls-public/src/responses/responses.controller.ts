import { Controller, Post, Param, Body, ParseIntPipe } from "@nestjs/common";
import { ResponsesService } from "./responses.service";
import { z } from "zod";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

/**
 * DTO schema for submitting responses
 * Validates an array of response objects
 *
 * Each response must include:
 * - questionSessionId: The ID of the question from polls.questions table
 * - response: The response value (index into the responses array)
 */
const submitResponsesSchema = z.array(
  z.object({
    questionSessionId: z.number().int(),
    response: z.number().int().nullable(),
  })
);

export type SubmitResponsesDto = z.infer<typeof submitResponsesSchema>;

/**
 * ResponsesController handles HTTP requests for submitting poll responses
 *
 * Base route: /sessions
 */
@Controller("sessions")
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  /**
   * POST /sessions/:sessionId/responses
   *
   * Submit responses to questions in a session from a single respondent
   *
   * The request body should be an array of response objects:
   * [
   *   { "questionSessionId": 1, "response": 2 },
   *   { "questionSessionId": 2, "response": 0 },
   *   ...
   * ]
   *
   * @param sessionId - The ID of the session (from URL parameter)
   * @param responses - Array of response objects containing questionSessionId and response value
   * @returns Confirmation of submission
   */
  @Post(":sessionId/responses")
  async submitResponses(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Body(new ZodValidationPipe(submitResponsesSchema))
    responses: SubmitResponsesDto
  ) {
    return this.responsesService.submitResponsesForRespondent(
      sessionId,
      responses
    );
  }
}
