import type { SessionCreated } from "shared-broker";
import { Statistics, SegmentViz } from "shared-computation";
import { sessionRegistry } from "../session-registry";
import type { HandlerArgs } from "../types";

/**
 * Helper: Load a session into memory
 * Creates Statistics and SegmentViz instances from session.created payload
 * and adds them to the session registry
 *
 * TODO -- push viz and splits to realtime after session creation
 */
function loadSession(payload: SessionCreated): void {
  const { sessionId, sessionConfig } = payload;

  // Create Statistics instance (no respondentsData or weightQuestion initially)
  const stats = new Statistics({
    responseQuestions: sessionConfig.responseQuestions,
    groupingQuestions: sessionConfig.groupingQuestions,
  });

  // Create SegmentViz instance
  const viz = new SegmentViz(stats, sessionConfig.segmentVizConfig);

  // Store in registry with empty Set of processed respondent IDs
  sessionRegistry.set(sessionId, {
    stats,
    viz,
    processedRespondentIds: new Set(),
  });

  console.log(`Session ${sessionId} loaded into memory`);
}

export async function handleSessionCreated(args: HandlerArgs) {
  const payload = args.payload as SessionCreated;
  const { sessionId } = payload;

  // Idempotency check: if session already exists, skip
  if (sessionRegistry.has(sessionId)) {
    console.log(`Session ${sessionId} already loaded in registry, skipping duplicate creation`);
    return;
  }

  loadSession(payload);

  // TODO: Publish session update to Redis pub/sub for real-time frontend updates
  // Even though splits are empty initially, push empty stats/viz so frontends
  // can start watching this session for real-time statistics updates
}
