import type { SessionEntry } from "./types";

/**
 * Session registry
 * Maps sessionId to in-memory Statistics and SegmentViz instances
 * Sessions are loaded when created, unloaded when closed or removed
 */
export const sessionRegistry = new Map<number, SessionEntry>();
