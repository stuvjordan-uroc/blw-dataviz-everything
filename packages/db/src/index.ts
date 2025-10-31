import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "dotenv";

config({ path: "../../.env" });

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { logger: false });

export * from "./schemas/questions/schema";
export {
  sessions,
  questions as pollQuestions,
  respondents,
  responses,
  sessionStatistics
} from "./schemas/polls/schema";
