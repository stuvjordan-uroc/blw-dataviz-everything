import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '../../.env' });

export default {
  schema: './src/schemas/*/schema.ts',
  out: './schema-migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;