# Database Migrations Guide

This package uses Drizzle ORM and Drizzle Kit for managing database schema migrations.

## Schema Organization

Schema source files are organized by PostgreSQL schema in `src/schemas/`:

```
src/schemas/
  questions/
    schema.ts      # Defines the "questions" schema and its tables
  [future-schema]/
    schema.ts      # Each DB schema gets its own folder
```

## Migration Scripts

### Schema Migrations

Schema migrations are automatically generated from your TypeScript schema definitions.

#### Generate Schema Migrations

To create a new migration from your schema changes:

```bash
# From the root directory
npm run db:generate

# Or from packages/db
npm run db:generate
```

This will:

1. Read all schema files matching `src/schemas/*/schema.ts`
2. Compare them with the current database state
3. Generate SQL migration files in `schema-migrations/`

#### Apply Schema Migrations

To apply pending migrations to your database:

```bash
# From the root directory
npm run db:migrate

# Or from packages/db
npm run db:migrate
```

#### Push Schema Changes (Dev Only)

For rapid development, you can push schema changes directly without creating migration files:

```bash
# From the root directory
npm run db:push

# Or from packages/db
npm run db:push
```

**⚠️ Warning:** This bypasses migration files and should only be used in development.

## Workflow

### Adding a New Schema

1. Create a new folder in `src/schemas/` (e.g., `src/schemas/analytics/`)
2. Create `schema.ts` in that folder
3. Define your PostgreSQL schema and tables:

```typescript
import { pgSchema, text, serial } from "drizzle-orm/pg-core";

export const analyticsSchema = pgSchema("analytics");

export const events = analyticsSchema.table("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // ... more columns
});
```

4. Export the schema from `src/index.ts`:

```typescript
export * from "./schemas/analytics/schema";
```

5. Generate and apply migrations:

```bash
npm run db:generate
npm run db:migrate
```

### Modifying an Existing Schema

1. Update the schema definition in the appropriate `src/schemas/*/schema.ts` file
2. Generate a new migration: `npm run db:generate`
3. Review the generated SQL in `migrations/`
4. Apply the migration: `npm run db:migrate`

## Database Management Scripts

From the root directory:

- `npm run db:start` - Start PostgreSQL container
- `npm run db:stop` - Stop PostgreSQL container
- `npm run db:logs` - View PostgreSQL logs
- `npm run db:reset` - Destroy and recreate the database
- `npm run db:fresh` - Reset database and run all migrations
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Configuration

The Drizzle configuration is in `drizzle.config.ts`:

```typescript
{
  schema: './src/schemas/*/schema.ts',  // Matches all schema files
  out: './migrations',                   // Migration output directory
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,     // From .env file
  },
}
```

## Data Migrations

Data migrations (separate from schema migrations) will be documented here once implemented.

## Best Practices

1. **Always review generated migrations** before applying them to production
2. **Test migrations** on a development database first
3. **Never edit migration files** after they've been applied
4. **Commit migration files** to version control
5. **Use `db:push` only in development** - always use proper migrations for production
6. **Keep schemas organized** - one folder per PostgreSQL schema in `src/schemas/`
