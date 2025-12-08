# shared-broker

Shared event types and Redis helpers for the polls system.

This package exports:

- `createRedisClient()` - returns an `ioredis` client configured from `REDIS_URL`.
- event type TypeScript types: `ResponseSubmittedEvent`, `SessionCreatedEvent`.
- stream name constants: `RESPONSES_STREAM`, `SESSIONS_STREAM`, `COMPUTE_GROUP`.

Usage:

- APIs publish events to Redis Streams using the `payload` field and JSON payload.
- Consumers should use consumer groups (e.g. `COMPUTE_GROUP`) and acknowledge messages after successful processing.

Example publisher:

```ts
import { createRedisClient, RESPONSES_STREAM } from "@shared-broker";
const redis = createRedisClient();
await redis.xadd(RESPONSES_STREAM, "*", "payload", JSON.stringify(event));
```
