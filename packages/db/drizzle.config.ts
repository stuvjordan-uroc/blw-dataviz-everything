import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '../../.env' });

export default {
  schema: './src/schema/*',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;