import type Redis from "ioredis";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { Statistics, SegmentViz } from "shared-computation";

/**
 * Session registry entry
 * Holds in-memory Statistics and SegmentViz instances for an active session
 */
export type SessionEntry = {
  stats: Statistics;
  viz: SegmentViz;
  processedRespondentIds: Set<number>;
};

/**
 * Handler arguments passed to each event handler
 */
export type HandlerArgs = {
  db: ReturnType<typeof drizzle> | null;
  redis: Redis;
  outboxId: number | null;
  eventType: string;
  payload: unknown;
  streamId: string;
  streamName: string;
  groupName: string;
  consumerName: string;
};
