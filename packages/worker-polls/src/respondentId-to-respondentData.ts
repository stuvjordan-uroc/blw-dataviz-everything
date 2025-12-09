import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray, and } from "drizzle-orm";
import { respondents, responses, pollQuestions } from "shared-schemas";
import type { RespondentData } from "shared-computation";

/**
 * Fetches response data for the specified respondents from the database
 * and transforms it into RespondentData format for Statistics processing.
 *
 * @param db - Drizzle database instance
 * @param sessionId - The session ID to filter respondents by
 * @param respondentIds - Array of respondent IDs to fetch data for
 * @returns Array of RespondentData objects (empty if no data found)
 */
export async function buildRespondentData(
  db: ReturnType<typeof drizzle>,
  sessionId: number,
  respondentIds: number[]
): Promise<RespondentData[]> {
  if (respondentIds.length === 0) {
    return [];
  }

  // Query the respondents' responses
  // Join respondents → responses → pollQuestions to get full response data
  const responseRows = await db
    .select({
      respondentId: respondents.id,
      varName: pollQuestions.varName,
      batteryName: pollQuestions.batteryName,
      subBattery: pollQuestions.subBattery,
      response: responses.response,
    })
    .from(respondents)
    .innerJoin(responses, eq(responses.respondentId, respondents.id))
    .innerJoin(pollQuestions, eq(pollQuestions.id, responses.questionSessionId))
    .where(
      and(
        eq(respondents.sessionId, sessionId),
        inArray(respondents.id, respondentIds)
      )
    );

  // Group responses by respondentId to construct RespondentData array
  const respondentDataMap = new Map<number, RespondentData>();
  for (const row of responseRows) {
    if (!respondentDataMap.has(row.respondentId)) {
      respondentDataMap.set(row.respondentId, {
        respondentId: row.respondentId,
        responses: [],
      });
    }
    respondentDataMap.get(row.respondentId)!.responses.push({
      varName: row.varName,
      batteryName: row.batteryName,
      subBattery: row.subBattery,
      response: row.response,
    });
  }

  return Array.from(respondentDataMap.values());
}
