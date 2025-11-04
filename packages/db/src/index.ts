import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "dotenv";

config({ path: "../../.env" });

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  onnotice: () => { }, // Suppress PostgreSQL NOTICE messages
});
export const db = drizzle(client, { logger: false });

export * from "shared-schemas";
