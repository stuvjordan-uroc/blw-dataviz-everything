# Database Migrations Guide

This package uses Drizzle ORM and Drizzle Kit for managing database schema migrations, and purpose built nodejs scripts for data migration.

## Schema Migrations

### Source Files

Schema source files are organized by PostgreSQL schema in `src/schemas/`:

```
src/schemas/
  questions/
    schema.ts      # Defines the "questions" schema and its tables
  [future-schema]/
    schema.ts      # Each DB schema gets its own folder
```

### Schema Migration Scripts

To create a new migration from your schema source files:

```bash
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
# Or from packages/db
npm run db:migrate
```

#### Push Schema Changes (Dev Only)

For rapid development, you can push schema changes directly without creating migration files:

```bash
# Or from packages/db
npm run db:push
```

**⚠️ Warning:** This bypasses migration files and should only be used in development.

### Schema Development Workflow

#### Adding a New Schema

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

#### Modifying an Existing Schema

1. Update the schema definition in the appropriate `src/schemas/*/schema.ts` file
2. Generate a new migration: `npm run db:generate`
3. Review the generated SQL in `migrations/`
4. Apply the migration: `npm run db:migrate`

## Data Migrations

Data migrations are separate from schema migrations and are used to populate or modify data in the database. They are tracked in a `data_migrations` table and can be run or rolled back independently.

### Data Migration Organization

Data migrations are organized by PostgreSQL schema in `src/data-migrations/`:

```
src/data-migrations/
  core.ts                    # Core migration engine and tracking
  types.ts                   # TypeScript interfaces
  index.ts                   # Central registry of all migrations
  run.ts                     # CLI script to apply migrations
  reset.ts                   # CLI script to rollback migrations
  utils/
    s3.ts                    # Utility functions (e.g., S3 data fetching)
  questions/
    index.ts                 # Registry of questions schema migrations
    0001_dem_characteristics.ts  # Individual migration file
    0002_next_migration.ts       # Next migration...
  [future-schema]/
    index.ts                 # Each schema gets its own folder
```

### Running Data Migrations

To apply pending data migrations:

```bash
# Run all migrations
npm run data:migrate

# Run only migrations for a specific schema
npm run data:migrate questions
npm run data:migrate responses
```

The migration runner will:

1. Create the tracking table if it doesn't exist
2. Check which migrations have already been applied
3. Run pending migrations in order
4. Record each successful migration in the tracking table

**NOTE**: Data migrations will typically pull and transform data from flat files stored in s3. So you'll typically need to authenticate to s3 before running any data migration script:

```bash
#from the root of the project
npm npm run aws:auth
```

### Rolling Back Data Migrations

To rollback data migrations (development only):

```bash
# Rollback all migrations
npm run data:reset

# Rollback only migrations for a specific schema
npm run data:reset questions
npm run data:reset responses
```

**⚠️ Warning:** Rollbacks execute the `down()` function of each migration in reverse order. Use with caution in production.

### Creating a New Data Migration

#### 1. Create the Migration File

Create a new file in the appropriate schema folder (e.g., `src/data-migrations/questions/0002_my_migration.ts`):

```typescript
import type { DataMigration } from "../types";
import { batteries, questions } from "../../schemas/questions/schema";

export const migration: DataMigration = {
  // Unique name following the pattern: schema_number_description
  name: "questions_0002_my_migration",

  // Apply the migration
  up: async (db) => {
    await db.insert(batteries).values({
      name: "new_battery",
      prefix: "NB",
    });

    // Add more data operations...
  },

  // Rollback the migration
  down: async (db) => {
    await db.delete(batteries).where(eq(batteries.name, "new_battery"));

    // Reverse all operations from up()...
  },
};
```

#### 2. Register the Migration

Add your migration to the schema's `index.ts` (e.g., `src/data-migrations/questions/index.ts`):

```typescript
import { migration as demCharacteristics } from "./0001_dem_characteristics";
import { migration as myMigration } from "./0002_my_migration";

const questionsMigrations: DataMigration[] = [
  demCharacteristics,
  myMigration, // Add your migration here
];

export default questionsMigrations;
```

Migrations run in the order they appear in this array.

#### 3. Run the Migration

```bash
npm run data:migrate questions
```

### Data Migration Best Practices

1. **Naming Convention**: Use the pattern `{schema}_{number}_{description}`

   - Example: `questions_0001_dem_characteristics`

2. **Numbering**: Use zero-padded sequential numbers (0001, 0002, etc.)

   - Makes alphabetical sorting match execution order

3. **Idempotency**: Migrations should be safe to run multiple times

   - Check if data exists before inserting
   - The tracking table prevents re-running applied migrations

4. **Reversibility**: Always implement the `down()` function

   - Delete data in reverse order of creation
   - Respect foreign key constraints

5. **External Data**: Use utility functions for fetching external data

   - Example: `fetchJsonFromS3()` for S3 data sources

6. **Transaction Safety**: Each migration runs in a transaction
   - If an error occurs, changes are rolled back
   - Ensure your migration is atomic

### Migration Tracking

The system uses a `data_migrations` table in the public schema:

```sql
CREATE TABLE data_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  schema TEXT NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

This tracks:

- Which migrations have been applied
- When they were applied
- Which PostgreSQL schema they belong to

### Adding a New Schema's Data Migrations

1. Create a new folder: `src/data-migrations/my_schema/`
2. Create `index.ts` to export the schema's migrations:

```typescript
import type { DataMigration } from "../types";

const myMigrations: DataMigration[] = [
  // Add migrations here
];

export default myMigrations;
```

3. Register in `src/data-migrations/index.ts`:

```typescript
import myMigrations from "./my_schema/index.js";

export const allMigrationsBySchema: SchemaMigrations[] = [
  { schema: "questions", migrations: questionsMigrations },
  { schema: "my_schema", migrations: myMigrations }, // Add here
];
```

4. Run with: `npm run data:migrate my_schema`
