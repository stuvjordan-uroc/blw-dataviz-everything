# Shared Package

This package contains shared database schemas, types, and validation schemas used across the BLW DataViz project.

## Purpose

The shared package centralizes:

- **Drizzle ORM schemas** - Database table definitions
- **TypeScript types** - Inferred from Drizzle schemas
- **Zod validation schemas** - Runtime validation for inserts and selects

This allows both the database package and API packages to import the same schemas and types, ensuring consistency across the application.

## Directory Structure

```
src/
├── index.ts                    # Main export file
└── schemas/
    ├── questions.ts            # Drizzle schema for questions tables
    ├── questions.zod.ts        # Zod validation schemas for questions tables
    ├── polls.ts                # Drizzle schema for polls tables
    └── polls.zod.ts            # Zod validation schemas for polls tables
```

## Schema Files Explained

### Drizzle Schema Files (`*.ts`)

These files define the database structure using Drizzle ORM:

- **`questions.ts`** - Defines the `questions` PostgreSQL schema with `batteries`, `sub_batteries`, and `questions` tables
- **`polls.ts`** - Defines the `polls` PostgreSQL schema with `sessions`, `questions`, `respondents`, `responses`, and `session_statistics` tables

Each file exports:

- The schema object (e.g., `questionsSchema`, `pollsSchema`)
- Table definitions (e.g., `batteries`, `questions`)
- TypeScript insert types (e.g., `BatteryInsert`, `QuestionInsert`)

### Zod Validation Files (`*.zod.ts`)

These files provide runtime validation schemas generated from the Drizzle schemas:

- **`questions.zod.ts`** - Zod schemas for questions tables
- **`polls.zod.ts`** - Zod schemas for polls tables

Each file exports insert and select schemas for each table:

- **Insert schemas** (e.g., `insertBatterySchema`) - For validating data before insertion (auto-generated fields are optional)
- **Select schemas** (e.g., `selectBatterySchema`) - For validating data retrieved from the database (all fields present)

## Adding a New Schema

Follow these steps to add a new PostgreSQL schema with tables:

### 1. Create the Drizzle Schema File

Create a new file in `src/schemas/` (e.g., `users.ts`):

```typescript
import { pgSchema, text, serial, timestamp } from "drizzle-orm/pg-core";
import type { InferInsertModel } from "drizzle-orm";

// Create the PostgreSQL schema
export const usersSchema = pgSchema("users");

// Define tables
export const users = usersSchema.table("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Export insert types
export type UserInsert = InferInsertModel<typeof users>;
```

### 2. Create the Zod Validation File

Create `src/schemas/users.zod.ts`:

```typescript
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./users";

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
```

**NOTE**: If you've defined json or jsonb columns in your schema, and you want zod schema validators for the json to be inserted into those columns, you have to write those by hand -- you can related on drizzle-zod utilities for that. For an example, see the session config validation schemas defined in src/schemas/polls.zod.ts.

### 3. Update the Main Export

Add exports to `src/index.ts`:

```typescript
// Add to schema exports
export * from "./schemas/users";

// Add to Zod validation exports
export * from "./schemas/users.zod";
```

### 4. Build the Package

```bash
npm run build
```

### 5. Generate and Apply Database Migrations

From the `packages/db` directory:

```bash
# Generate migration files from the new schema
npm run db:generate

# Apply migrations to the database
npm run db:migrate
```

## Modifying an Existing Schema

### 1. Update the Drizzle Schema File

Make your changes to the appropriate schema file (e.g., `src/schemas/questions.ts`):

- Add/remove columns
- Change column types or constraints
- Add/remove tables

### 2. Rebuild the Package

```bash
npm run build
```

### 3. Generate and Apply Migrations

From `packages/db`:

```bash
# Generate a new migration file with your changes
npm run db:generate

# Review the generated SQL in packages/db/schema-migrations/
# Then apply it to the database
npm run db:migrate
```

### 4. Update Zod Schemas (if needed)

The Zod schemas are auto-generated from Drizzle schemas, so they'll automatically reflect your changes after rebuilding. However, if you need custom validation rules, you can modify the `*.zod.ts` files:

```typescript
// Example: Add custom validation
export const insertUserSchema = createInsertSchema(users).refine(
  (data) => data.email.includes("@"),
  { message: "Email must contain @" }
);
```

## Usage in Other Packages

### In the Database Package

```typescript
import { db } from "./db";
import { batteries, insertBatterySchema } from "shared";

// Validate and insert
const data = insertBatterySchema.parse({ name: "test", prefix: "T" });
await db.insert(batteries).values(data);
```

### In API Packages

```typescript
import { insertBatterySchema, batteries } from "shared";

// Validate request body
const result = insertBatterySchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ errors: result.error.errors });
}

// result.data is type-safe and validated
await db.insert(batteries).values(result.data);
```

## Important Notes

- **Schema Migrations**: Always generate and review migration files before applying them to production
- **Drizzle Config**: The `packages/db/drizzle.config.ts` points to `../shared/src/schemas/*.ts` for schema discovery
- **TypeScript**: This package must be built before the db package can use it
- **Zod Schemas**: Auto-generated schemas work for most cases, but can be customized with `.refine()` or `.extend()` for additional validation
