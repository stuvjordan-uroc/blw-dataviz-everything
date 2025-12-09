import type { ResponseSubmitted } from "shared-broker";
import { buildRespondentData } from "../respondentId-to-respondentData";
import { sessionRegistry } from "../session-registry";
import type { HandlerArgs } from "../types";

/**
 *
 * TODO:  Publish splits and viz to realtime once splits are updated.
 * TODO:  Is there any chance that a response arrives before a "create session"?
 * If so, handle that case.
 *
 * @param args
 * @returns
 */

export async function handleResponseSubmitted(args: HandlerArgs) {
  const { db, payload } = args;
  const { sessionId, respondentId } = payload as ResponseSubmitted;

  // Check if session is loaded in memory
  const session = sessionRegistry.get(sessionId);
  if (!session) {
    console.warn(
      `Session ${sessionId} not found in registry for respondent ${respondentId}. Skipping.`
    );
    return;
  }

  // Query DB for this respondent's responses
  if (!db) {
    throw new Error("Database connection required for handleResponseSubmitted");
  }

  // Fetch this respondent's data
  const respondentDataArray = await buildRespondentData(db, sessionId, [
    respondentId,
  ]);

  // Update Statistics with this respondent's data
  const result = session.stats.updateSplits(respondentDataArray);

  // Track that this respondent has been processed
  session.processedRespondentIds.add(respondentId);

  // TODO: Publish session update to Redis pub/sub for real-time frontend updates
  // Send updated splits and visualization data to all connected clients watching this session

  if (result.invalidCount > 0) {
    console.warn(
      `Respondent ${respondentId} has invalid responses (session ${sessionId})`
    );
  }

  console.log(
    `Updated statistics for session ${sessionId}: processed ${result.totalProcessed} total (${result.validCount} valid, ${result.invalidCount} invalid)`
  );
}
