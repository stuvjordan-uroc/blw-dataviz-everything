import type { ResponseSubmitted } from "shared-broker";
import { buildRespondentData } from "../respondentId-to-respondentData";
import { sessionRegistry } from "../session-registry";
import { sessions } from "shared-schemas";
import { eq } from "drizzle-orm";
import type { HandlerArgs } from "../types";
import { handleSessionCreated } from "./session-created";

/**
 *
 * TODO:  Publish splits and viz to realtime once splits are updated.
 *
 * @param args
 * @returns
 */

export async function handleResponseSubmitted(args: HandlerArgs) {
  const { db, payload } = args;
  const { sessionId, respondentId } = payload as ResponseSubmitted;

  if (!db) {
    throw new Error("Database connection required for handleResponseSubmitted");
  }

  // Check if session is loaded in memory
  let session = sessionRegistry.get(sessionId);

  if (!session) {
    console.warn(
      `Session ${sessionId} not found in registry for respondent ${respondentId}. ` +
      `Attempting lazy load from database...`
    );

    // Lazy load: fetch session from DB and load it
    const [sessionRow] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!sessionRow) {
      throw new Error(
        `Session ${sessionId} does not exist in database. Cannot process response.`
      );
    }

    if (!sessionRow.sessionConfig) {
      throw new Error(
        `Session ${sessionId} has no sessionConfig. Cannot load into memory.`
      );
    }

    // Construct a SessionCreated-like payload and load the session
    const mockPayload = {
      sessionId: sessionRow.id,
      slug: sessionRow.slug,
      sessionConfig: sessionRow.sessionConfig,
      description: sessionRow.description,
      createdAt: sessionRow.createdAt?.toISOString() ?? new Date().toISOString(),
    };

    // Call handleSessionCreated to load it (which is now idempotent)
    await handleSessionCreated({ ...args, payload: mockPayload });

    // Retrieve the newly loaded session
    session = sessionRegistry.get(sessionId);

    if (!session) {
      throw new Error(
        `Failed to lazy load session ${sessionId} into registry`
      );
    }

    console.log(`Successfully lazy-loaded session ${sessionId}`);
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
