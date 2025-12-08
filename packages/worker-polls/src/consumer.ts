import type Redis from 'ioredis';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { ZodError } from 'zod';
import { eq } from 'drizzle-orm';

import { eventSchemas } from 'shared-broker';
import type { SessionCreated, ResponseSubmitted } from 'shared-broker';
import { outboxEvents, outboxDlq, respondents, responses, pollQuestions } from 'shared-schemas';
import { Statistics, SegmentViz, type RespondentData } from 'shared-computation';

const MAX_FAILURES = Number(process.env.CONSUMER_MAX_ATTEMPTS ?? 5);

/**
 * Session registry entry
 * Holds in-memory Statistics and SegmentViz instances for an active session
 */
type SessionEntry = {
  stats: Statistics;
  viz: SegmentViz;
};

/**
 * Session registry
 * Maps sessionId to in-memory Statistics and SegmentViz instances
 * Sessions are loaded when created, unloaded when closed or removed
 */
const sessionRegistry = new Map<number, SessionEntry>();

type HandlerArgs = {
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

/**
 * Helper: Load a session into memory
 * Creates Statistics and SegmentViz instances from session.created payload
 * and adds them to the session registry
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

  // Store in registry
  sessionRegistry.set(sessionId, { stats, viz });

  console.log(`Session ${sessionId} loaded into memory`);
}

async function handleSessionCreated(args: HandlerArgs) {
  const payload = args.payload as SessionCreated;
  loadSession(payload);

  // TODO: Publish session update to Redis pub/sub for real-time frontend updates
  // Even though splits are empty initially, push empty stats/viz so frontends
  // can start watching this session for real-time statistics updates
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleSessionStatusChanged(_args: HandlerArgs) {
  // drain or rehydrate session based on payload.isOpen
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleSessionRemoved(_args: HandlerArgs) {
  // unload and delete all in-memory state for the session
}

async function handleResponseSubmitted(args: HandlerArgs) {
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
    throw new Error('Database connection required for handleResponseSubmitted');
  }

  // Join respondents → responses → questions to get full response data
  const responseRows = await db
    .select({
      varName: pollQuestions.varName,
      batteryName: pollQuestions.batteryName,
      subBattery: pollQuestions.subBattery,
      response: responses.response,
    })
    .from(respondents)
    .innerJoin(responses, eq(responses.respondentId, respondents.id))
    .innerJoin(
      pollQuestions,
      eq(pollQuestions.id, responses.questionSessionId)
    )
    .where(eq(respondents.id, respondentId));

  // Transform to RespondentData format
  const respondentData: RespondentData = {
    respondentId,
    responses: responseRows.map((row) => ({
      varName: row.varName,
      batteryName: row.batteryName,
      subBattery: row.subBattery,
      response: row.response,
    })),
  };

  // Update Statistics with this respondent's data
  const result = session.stats.updateSplits([respondentData]);

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

const handlers: Record<string, (args: HandlerArgs) => Promise<void>> = {
  'session.created': handleSessionCreated,
  'session.status.changed': handleSessionStatusChanged,
  'session.removed': handleSessionRemoved,
  'response.submitted': handleResponseSubmitted,
};

function validateEvent(eventType: string, payload: unknown) {
  const schema = (eventSchemas as Record<string, { parse: (data: unknown) => unknown }>)[eventType];
  if (!schema) throw new Error(`No schema for eventType ${eventType}`);
  return schema.parse(payload);
}

export async function consumerLoop(
  redis: Redis,
  streamName: string,
  groupName: string,
  consumerName: string,
  payloadKey = 'payload'
) {
  console.log(`consumerLoop: consumer=${consumerName} group=${groupName} stream=${streamName}`);

  const connectionString = process.env.DATABASE_URL;
  const sql = connectionString ? postgres(connectionString) : null;
  const db = sql ? drizzle(sql, { logger: false }) : null;

  while (true) {
    try {
      // ioredis types don't properly reflect BLOCK parameter, but it's valid
      const res = (await redis.xreadgroup(
        'GROUP',
        groupName,
        consumerName,
        // @ts-expect-error - ioredis typing issue
        'BLOCK',
        5000,
        'COUNT',
        10,
        'STREAMS',
        streamName,
        '>'
      )) as [string, [string, string[]][]][] | null;
      if (!res) continue;

      for (const [, messages] of res) {
        for (const [id, fields] of messages as [string, string[]][]) {
          const streamId = id;
          try {
            const fieldMap: Record<string, string> = {};
            for (let i = 0; i < fields.length; i += 2) {
              fieldMap[fields[i]] = fields[i + 1];
            }

            const outboxIdRaw = fieldMap['outboxId'];
            const eventType = fieldMap['eventType'];
            const raw = fieldMap[payloadKey];

            const outboxId = outboxIdRaw ? Number(outboxIdRaw) : null;

            if (!eventType || !raw) {
              console.warn('message missing eventType or payload — moving to DLQ', { streamId });
              if (db) {
                await db.insert(outboxDlq).values({
                  outboxId,
                  streamName,
                  streamId,
                  eventType: eventType ?? 'unknown',
                  payload: raw ? JSON.parse(raw) : {},
                  errorMessage: 'missing eventType or payload',
                });
              }
              await redis.xack(streamName, groupName, id);
              continue;
            }

            let payload: unknown;
            try {
              payload = JSON.parse(raw);
            } catch (err) {
              console.warn('invalid JSON payload — moving to DLQ', { streamId, outboxId });
              if (db) {
                await db.insert(outboxDlq).values({
                  outboxId,
                  streamName,
                  streamId,
                  eventType,
                  payload: { rawString: raw },
                  errorMessage: String((err as Error)?.message ?? err),
                });
              }
              await redis.xack(streamName, groupName, id);
              continue;
            }

            // Zod validation
            let parsed: unknown;
            try {
              parsed = validateEvent(eventType, payload);
            } catch (err) {
              if (err instanceof ZodError) {
                console.warn('payload validation failed — moving to DLQ', { streamId, outboxId, eventType });
                if (db) {
                  await db.insert(outboxDlq).values({
                    outboxId,
                    streamName,
                    streamId,
                    eventType,
                    payload: payload as Record<string, unknown>,
                    errorMessage: JSON.stringify(err.errors),
                  });
                }
                await redis.xack(streamName, groupName, id);
                continue;
              }
              throw err;
            }

            const handler = handlers[eventType];
            if (!handler) {
              console.warn('no handler for eventType, acking', { eventType });
              await redis.xack(streamName, groupName, id);
              continue;
            }

            try {
              await handler({ db, redis, outboxId, eventType, payload: parsed, streamId, streamName, groupName, consumerName });
              await redis.xack(streamName, groupName, id);
            } catch (err) {
              console.error('handler error', { eventType, outboxId, streamId }, err);
              if (db && outboxId) {
                // increment attempts and record lastError
                const rows = await db
                  .select({ attempts: outboxEvents.attempts })
                  .from(outboxEvents)
                  .where(eq(outboxEvents.id, outboxId));

                const attempts = rows[0]?.attempts ?? 0;
                const nextAttempts = attempts + 1;
                await db.update(outboxEvents).set({ attempts: nextAttempts, lastError: String((err as Error)?.message ?? err) }).where(eq(outboxEvents.id, outboxId));

                if (nextAttempts >= MAX_FAILURES) {
                  // move to DLQ and ack
                  await db.insert(outboxDlq).values({
                    outboxId,
                    streamName,
                    streamId,
                    eventType,
                    payload: parsed as Record<string, unknown>,
                    errorMessage: String((err as Error)?.message ?? err),
                  });
                  await redis.xack(streamName, groupName, id);
                } else {
                  // leave unacked so it can be retried
                }
              } else {
                // no DB or no outboxId — after a single failure move to DLQ to avoid blocking
                if (db) {
                  await db.insert(outboxDlq).values({
                    outboxId: outboxId ?? null,
                    streamName,
                    streamId,
                    eventType,
                    payload: parsed as Record<string, unknown>,
                    errorMessage: String((err as Error)?.message ?? err),
                  });
                }
                await redis.xack(streamName, groupName, id);
              }
            }
          } catch (err) {
            console.error('failed processing message (outer)', { id }, err);
            // leave for retry by consumer group
          }
        }
      }
    } catch (err) {
      console.error('consumerLoop error', err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
