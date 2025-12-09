import type Redis from "ioredis";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { ZodError } from "zod";
import { eq } from "drizzle-orm";

import { eventSchemas } from "shared-broker";
import { outboxEvents, outboxDlq } from "shared-schemas";
import type { HandlerArgs } from "./types";
import { handleSessionCreated } from "./handlers/session-created";
import { handleSessionStatusChanged } from "./handlers/session-status-changed";
import { handleSessionRemoved } from "./handlers/session-removed";
import { handleResponseSubmitted } from "./handlers/response-submitted";

const MAX_FAILURES = Number(process.env.CONSUMER_MAX_ATTEMPTS ?? 5);

const handlers: Record<string, (args: HandlerArgs) => Promise<void>> = {
  "session.created": handleSessionCreated,
  "session.status.changed": handleSessionStatusChanged,
  "session.removed": handleSessionRemoved,
  "response.submitted": handleResponseSubmitted,
};

function validateEvent(eventType: string, payload: unknown) {
  const schema = (
    eventSchemas as Record<string, { parse: (data: unknown) => unknown }>
  )[eventType];
  if (!schema) throw new Error(`No schema for eventType ${eventType}`);
  return schema.parse(payload);
}

export async function consumerLoop(
  redis: Redis,
  streamName: string,
  groupName: string,
  consumerName: string,
  payloadKey = "payload"
) {
  console.log(
    `consumerLoop: consumer=${consumerName} group=${groupName} stream=${streamName}`
  );

  const connectionString = process.env.DATABASE_URL;
  const sql = connectionString ? postgres(connectionString) : null;
  const db = sql ? drizzle(sql, { logger: false }) : null;

  while (true) {
    try {
      // ioredis types don't properly reflect BLOCK parameter, but it's valid
      const res = (await redis.xreadgroup(
        "GROUP",
        groupName,
        consumerName,
        // @ts-expect-error - ioredis typing issue
        "BLOCK",
        5000,
        "COUNT",
        10,
        "STREAMS",
        streamName,
        ">"
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

            const outboxIdRaw = fieldMap["outboxId"];
            const eventType = fieldMap["eventType"];
            const raw = fieldMap[payloadKey];

            const outboxId = outboxIdRaw ? Number(outboxIdRaw) : null;

            if (!eventType || !raw) {
              console.warn(
                "message missing eventType or payload — moving to DLQ",
                { streamId }
              );
              if (db) {
                await db.insert(outboxDlq).values({
                  outboxId,
                  streamName,
                  streamId,
                  eventType: eventType ?? "unknown",
                  payload: raw ? JSON.parse(raw) : {},
                  errorMessage: "missing eventType or payload",
                });
              }
              await redis.xack(streamName, groupName, id);
              continue;
            }

            let payload: unknown;
            try {
              payload = JSON.parse(raw);
            } catch (err) {
              console.warn("invalid JSON payload — moving to DLQ", {
                streamId,
                outboxId,
              });
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
                console.warn("payload validation failed — moving to DLQ", {
                  streamId,
                  outboxId,
                  eventType,
                });
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
              console.warn("no handler for eventType, acking", { eventType });
              await redis.xack(streamName, groupName, id);
              continue;
            }

            try {
              await handler({
                db,
                redis,
                outboxId,
                eventType,
                payload: parsed,
                streamId,
                streamName,
                groupName,
                consumerName,
              });
              await redis.xack(streamName, groupName, id);
            } catch (err) {
              console.error(
                "handler error",
                { eventType, outboxId, streamId },
                err
              );
              if (db && outboxId) {
                // increment attempts and record lastError
                const rows = await db
                  .select({ attempts: outboxEvents.attempts })
                  .from(outboxEvents)
                  .where(eq(outboxEvents.id, outboxId));

                const attempts = rows[0]?.attempts ?? 0;
                const nextAttempts = attempts + 1;
                await db
                  .update(outboxEvents)
                  .set({
                    attempts: nextAttempts,
                    lastError: String((err as Error)?.message ?? err),
                  })
                  .where(eq(outboxEvents.id, outboxId));

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
            console.error("failed processing message (outer)", { id }, err);
            // leave for retry by consumer group
          }
        }
      }
    } catch (err) {
      console.error("consumerLoop error", err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
