import {
  createRedisClient,
  RESPONSES_STREAM,
  COMPUTE_GROUP,
  payloadFieldKey,
} from "shared-broker";
import { consumerLoop } from "./consumer";

async function bootstrap() {
  console.log("worker-polls: starting");
  const redis = createRedisClient();

  // ensure consumer group exists (MKSTREAM creates the stream if it doesn't exist)
  try {
    await redis.xgroup(
      "CREATE",
      RESPONSES_STREAM,
      COMPUTE_GROUP,
      "$",
      "MKSTREAM"
    );
    console.log("consumer group created");
  } catch (e: any) {
    if (!/BUSYGROUP/.test(String(e))) {
      console.error("failed creating consumer group", e);
      process.exit(1);
    }
  }

  const consumerName = process.env.HOSTNAME || `worker-${Date.now()}`;
  // Start the consumer loop for processing responses
  consumerLoop(
    redis,
    RESPONSES_STREAM,
    COMPUTE_GROUP,
    consumerName,
    payloadFieldKey()
  ).catch((err) => {
    console.error("consumerLoop failed", err);
  });

  // Start the outbox relay in parallel to publish events produced by admin API
  const connectionString = process.env.DATABASE_URL;
  import("./relay")
    .then((mod) => {
      mod.outboxRelayLoop(redis, connectionString).catch((err) => {
        console.error("outboxRelayLoop failed", err);
      });
    })
    .catch((err) => {
      console.error("failed to load relay module", err);
    });
}

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception", err);
  process.exit(1);
});

bootstrap().catch((err) => {
  console.error("bootstrap error", err);
  process.exit(1);
});
