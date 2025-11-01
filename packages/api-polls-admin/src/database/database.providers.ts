import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/**
 * DATABASE_CONNECTION is a special token used by NestJS's dependency injection system.
 * 
 * When we want to inject the database into a service, we use:
 * @Inject(DATABASE_CONNECTION) private db: ReturnType<typeof drizzle>
 * 
 * This is like a "key" that tells NestJS which provider to inject.
 */
export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

/**
 * Database provider for NestJS dependency injection
 * 
 * This creates the actual database connection using Drizzle ORM and postgres.js
 * It will be registered in the DatabaseModule and made available app-wide.
 */
export const databaseProviders = [
  {
    provide: DATABASE_CONNECTION,
    useFactory: () => {
      const connectionString = process.env.DATABASE_URL;

      if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      // Create the postgres connection
      const client = postgres(connectionString);

      // Return the Drizzle ORM instance
      return drizzle(client, { logger: false });
    },
  },
];
