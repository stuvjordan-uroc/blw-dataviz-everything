import type Redis from 'ioredis';
import { RESPONSES_STREAM, SESSIONS_STREAM, payloadFieldKey } from 'shared-broker';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { outboxEvents } from 'shared-schemas';
import { eq, and, lt, sql as drizzleSql } from 'drizzle-orm';

const DEFAULT_BATCH = 10;
const POLL_MS = Number(process.env.OUTBOX_POLL_MS ?? 1000);
const MAX_ATTEMPTS = Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 5);

function streamForEvent(eventType: string): string {
  if (eventType.startsWith('session.')) return SESSIONS_STREAM;
  if (eventType.startsWith('response.')) return RESPONSES_STREAM;
  // fallback
  return RESPONSES_STREAM;
}

export async function outboxRelayLoop(redis: Redis, connectionString?: string) {
  console.log('outboxRelay: starting');
  const connectionStringResolved = connectionString ?? process.env.DATABASE_URL;
  if (!connectionStringResolved) {
    console.warn('outboxRelay: no DATABASE_URL provided; relay will not run');
    return;
  }

  const sql = postgres(connectionStringResolved);
  const db = drizzle(sql, { logger: false });
  const consumerName = process.env.HOSTNAME || `relay-${Date.now()}`;

  while (true) {
    try {
      // Claim a batch of un-published outbox rows using SELECT ... FOR UPDATE SKIP LOCKED
      const claimed = await db.transaction(async (tx) => {
        // Select rows to claim
        const rows = await tx
          .select({
            id: outboxEvents.id,
            eventType: outboxEvents.eventType,
            payload: outboxEvents.payload,
            attempts: outboxEvents.attempts,
            createdAt: outboxEvents.createdAt,
          })
          .from(outboxEvents)
          .where(
            and(
              eq(outboxEvents.published, false),
              lt(outboxEvents.attempts, MAX_ATTEMPTS)
            )
          )
          .orderBy(outboxEvents.createdAt)
          .limit(DEFAULT_BATCH)
          .for('update', { skipLocked: true });

        if (!rows || rows.length === 0) {
          return [];
        }

        // Mark them locked by this consumer
        for (const row of rows) {
          await tx
            .update(outboxEvents)
            .set({
              lockOwner: consumerName,
              lockedAt: drizzleSql`now()`,
            })
            .where(eq(outboxEvents.id, row.id));
        }

        return rows;
      });

      if (!claimed || claimed.length === 0) {
        // nothing to do
        await new Promise((r) => setTimeout(r, POLL_MS));
        continue;
      }

      for (const row of claimed) {
        try {
          const eventType = row.eventType;
          const payload = row.payload;
          const stream = streamForEvent(eventType);

          // Publish metadata fields so consumers can act deterministically.
          // Include outboxId, eventType, payload (JSON), and createdAt timestamp.
          await redis.xadd(
            stream,
            '*',
            'outboxId', String(row.id),
            'eventType', eventType,
            payloadFieldKey(), JSON.stringify(payload),
            'createdAt', row.createdAt?.toISOString() ?? new Date().toISOString()
          );

          // mark published
          await db
            .update(outboxEvents)
            .set({
              published: true,
              publishedAt: new Date(),
            })
            .where(eq(outboxEvents.id, row.id));

          console.log('outboxRelay: published event', { id: row.id, eventType });
        } catch (err) {
          console.error('outboxRelay: failed publishing', row.id, err instanceof Error ? err.message : err);
          // increment attempts and record error
          await db
            .update(outboxEvents)
            .set({
              attempts: (row.attempts ?? 0) + 1,
              lastError: err instanceof Error ? err.message : String(err),
            })
            .where(eq(outboxEvents.id, row.id));
        }
      }
    } catch (err) {
      console.error('outboxRelay: loop error', err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
