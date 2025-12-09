import { eq } from "drizzle-orm";
import type { SessionStatusChanged } from "shared-broker";
import { respondents, sessionStatistics } from "shared-schemas";
import { Statistics, SegmentViz } from "shared-computation";
import { buildRespondentData } from "../respondentId-to-respondentData";
import { sessionRegistry } from "../session-registry";
import type { HandlerArgs } from "../types";

/**
 *
 * TODO: On Open -> Closed, if un-processed responses are found, push splits and viz to realtime after update
 * TODO: On Closed -> Open, push splits and viz to realtime after instantiation.
 *
 *
 * @param args
 * @returns
 */

export async function handleSessionStatusChanged(args: HandlerArgs) {
  const { db, payload } = args;
  const { sessionId, isOpen } = payload as SessionStatusChanged;

  if (!db) {
    throw new Error(
      "Database connection required for handleSessionStatusChanged"
    );
  }

  if (!isOpen) {
    // Case 1: Open → Closed
    // The session has been closed. We need to:
    // 1. Verify all responses have been processed
    // 2. Persist statistics to the database
    // 3. Clean up in-memory state

    const session = sessionRegistry.get(sessionId);
    if (!session) {
      console.warn(
        `Session ${sessionId} not found in registry during Open → Closed transition. Nothing to persist.`
      );
      return;
    }

    // Query all respondents for this session from the database
    const allRespondentIds = (
      await db
        .select({ id: respondents.id })
        .from(respondents)
        .where(eq(respondents.sessionId, sessionId))
    ).map((r) => r.id);

    // Find any respondents in the DB that haven't been processed yet
    // This can happen if events arrived out of order or if there was a crash
    const missingRespondentIds = allRespondentIds.filter(
      (id) => !session.processedRespondentIds.has(id)
    );

    if (missingRespondentIds.length > 0) {
      console.log(
        `Session ${sessionId} closing: catching up ${missingRespondentIds.length} missing respondents`
      );

      // Fetch the missing respondents' data
      const missingDataArray = await buildRespondentData(
        db,
        sessionId,
        missingRespondentIds
      );

      // Update statistics with missing respondents
      session.stats.updateSplits(missingDataArray);

      // Add to processed set
      missingRespondentIds.forEach((id) =>
        session.processedRespondentIds.add(id)
      );
    }

    // Get the splits from the Statistics instance
    const splits = session.stats.getSplits();

    // Persist statistics to the database
    // Use INSERT ... ON CONFLICT to handle the case where statistics already exist
    await db
      .insert(sessionStatistics)
      .values({
        sessionId,
        statistics: splits,
        computedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: sessionStatistics.sessionId,
        set: {
          statistics: splits,
          computedAt: new Date(),
        },
      });

    // Clean up in-memory state
    sessionRegistry.delete(sessionId);

    console.log(
      `Session ${sessionId} closed: persisted statistics (${session.processedRespondentIds.size} respondents processed) and cleaned up memory`
    );
  } else {
    // Case 2: Closed → Open
    // The session is being reopened. We need to:
    // 1. Load the session configuration from the database
    // 2. Query all existing respondents and their responses for this session
    // 3. Reconstruct Statistics instance from the respondent data
    // 4. Re-create the SegmentViz instance
    // 5. Restore the Set of processed respondent IDs
    // 6. Add to session registry so new responses can be processed incrementally

    // Check if session is already loaded
    if (sessionRegistry.has(sessionId)) {
      console.warn(
        `Session ${sessionId} already loaded in registry during Closed → Open transition. Skipping.`
      );
      return;
    }

    // Get the session configuration
    const { sessions } = await import("shared-schemas");
    const [sessionRow] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!sessionRow || !sessionRow.sessionConfig) {
      throw new Error(
        `Cannot load session ${sessionId}: session config not found in database`
      );
    }

    const { sessionConfig } = sessionRow;

    // Get all respondent IDs for this session
    const allRespondentIds = (
      await db
        .select({ id: respondents.id })
        .from(respondents)
        .where(eq(respondents.sessionId, sessionId))
    ).map((r) => r.id);

    // Fetch all respondent data using the helper function
    const respondentDataArray = await buildRespondentData(
      db,
      sessionId,
      allRespondentIds
    );

    // Create Statistics instance with the respondent data
    // If there are no respondents yet, this creates an empty Statistics instance
    const stats = new Statistics(
      {
        responseQuestions: sessionConfig.responseQuestions,
        groupingQuestions: sessionConfig.groupingQuestions,
      },
      respondentDataArray
    );

    // Create SegmentViz instance
    const viz = new SegmentViz(stats, sessionConfig.segmentVizConfig);

    // Restore processedRespondentIds Set from the respondents we just loaded
    const processedRespondentIds = new Set(
      respondentDataArray.map((rd) => rd.respondentId)
    );

    // Store in registry
    sessionRegistry.set(sessionId, { stats, viz, processedRespondentIds });

    console.log(
      `Session ${sessionId} reopened: loaded ${respondentDataArray.length} respondents from database`
    );
  }
}
