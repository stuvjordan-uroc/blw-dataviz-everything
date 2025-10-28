# BLW DataViz Everything

A monorepo for blw dataviz...

- db
  - schema and data migrations
  - deployment
- api
  - polling
  - vizualizations
- frontend
  - polling
  - vizualizations

## Project Structure

```
blw-dataviz-everything/
├── docker-compose.yml      # Local development services
├── .env                    # Environment configuration
├── package.json           # Root workspace configuration
└── packages/
    └── db/                 # Database package
        ├── src/
        │   ├── index.ts    # Database connection and exports
        │   ├── types/
        │   │   └── migrations.ts  # Type definitions for data migrations
        │   ├── schemas/
        │   │   ├── questions/     # PostgreSQL schema: questions
        │   │   │   ├── schema.ts  # Table definitions (Drizzle schema)
        │   │   │   ├── types.ts   # Schema-specific types
        │   │   │   └── data-migrations/
        │   │   │       ├── perf-imp.ts    # Data migration config
        │   │   │       └── index.ts       # Re-exports all configs
        │   │   └── users/         # PostgreSQL schema: users
        │   │       ├── schema.ts
        │   │       └── data-migrations/
        │   └── scripts/
        │       ├── generate-migration.ts  # Migration generator
        │       └── utils/
        │           └── parsers.ts         # S3 fetch and parsing utilities
        ├── migrations/     # Generated SQL and TypeScript migration files
        ├── drizzle.config.ts
```

## Development

This is a monorepo using npm workspaces. Each package can be developed independently while sharing common configuration.

### Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start local services:

   ```bash
   npm run db:start
   ```

3. Set up database schema:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. Start development:
   ```bash
   npm run dev
   ```

## Database Management

This project uses Drizzle ORM with PostgreSQL for database management. We follow a **unified migration approach** that combines both schema and data migrations into single, versioned units.

### Architecture Overview

The database package is organized by **PostgreSQL schemas** (logical groupings of tables). Each schema has:

1. **Table Definitions** (`schema.ts`) - Drizzle ORM table definitions
2. **Type Exports** (`types.ts`) - Schema-specific types for type-safe data migrations
3. **Data Migration Configs** (`data-migrations/*.ts`) - Configuration files that define how to load data from S3 into tables

### Data Source Management

Instead of storing data files in the repository, we use S3 for data source storage:

- **S3 Configuration**: Defined in `packages/db/data-sources.json`
- **Data Sources**: Raw CSV and JSON files stored in S3 bucket
- **Migration Integration**: Data transformations defined in data migration config files within each schema directory

### Local Development Setup

1. **Configure AWS SSO** (first time only):

   ```bash
   aws configure sso --profile default
   ```

   You'll need:

   - SSO start URL (e.g., `https://your-org.awsapps.com/start`)
   - SSO region (e.g., `us-east-1`)
   - Account ID
   - Role name
   - Output format (`json` recommended)

2. **Authenticate with AWS SSO**:

   ```bash
   npm run aws:auth
   ```

   This script will:

   - Check your current AWS SSO session status
   - Automatically login if session is expired
   - Show token expiration time
   - Verify S3 access permissions

3. **Start the database**:

   ```bash
   npm run db:start
   ```

4. **Create your first unified migration**:

   ```bash
   npm run db:generate
   ```

5. **Apply migrations** (both schema and data):

   ```bash
   npm run db:migrate
   ```

6. **Open Drizzle Studio** (web UI for database):

   ```bash
   npm run db:studio
   ```

### Available Commands

**AWS Authentication:**

- `npm run aws:auth` - Authenticate with AWS SSO (checks session, auto-login if needed)
- `npm run aws:logout` - Logout from AWS SSO session

**Database Operations:**

- `npm run db:start` - Start PostgreSQL container
- `npm run db:stop` - Stop all containers
- `npm run db:logs` - View database logs
- `npm run db:reset` - Reset database (removes all data)
- `npm run db:generate` - Generate unified migration (schema + data)
- `npm run db:generate:named "migration-name"` - Generate named migration
- `npm run db:migrate` - Apply all pending migrations
- `npm run db:rollback` - Rollback last data migration
- `npm run db:fresh` - Fresh start: reset, migrate, and seed
- `npm run db:studio` - Open Drizzle Studio web interface

### Unified Migration Workflow

**⚠️ Important: This system creates unified migrations that handle both schema and data changes together**

#### 1. Create or Update Schema Definitions

Define your PostgreSQL schema and tables in `packages/db/src/schemas/<schema-name>/schema.ts`:

```typescript
import { pgTable, serial, text, jsonb, pgSchema } from "drizzle-orm/pg-core";
import type { InferInsertModel } from "drizzle-orm";

// Define PostgreSQL schema
export const questionsSchema = pgSchema("questions");

// Define tables
export const batteries = questionsSchema.table("batteries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subBatteries: jsonb("sub_batteries").$type<string[]>(),
  prefix: text("prefix").notNull(),
});

export const questions = questionsSchema.table("questions", {
  id: serial("id").primaryKey(),
  batteryId: serial("battery_id").references(() => batteries.id),
  variableName: text("variable_name").notNull(),
  questionText: text("question_text").notNull(),
  shortText: text("short_text").notNull(),
  category: text("category").notNull(),
});

// Export insert types for use in data migrations
export type BatteryInsert = InferInsertModel<typeof batteries>;
export type QuestionInsert = InferInsertModel<typeof questions>;
```

#### 2. Create Schema-Specific Types (Optional but Recommended)

Create a `types.ts` file to define type-safe mappings for your data migrations:

```typescript
import type { BatteryInsert, QuestionInsert } from "./schema";

/**
 * Type-safe mapping for questions schema data migrations
 */
export type QuestionsSchemaRowsMap = {
  batteries?: BatteryInsert[];
  questions?: QuestionInsert[];
};
```

#### 3. Write Data Migration Config

Create a data migration config file in `packages/db/src/schemas/<schema-name>/data-migrations/<migration-name>.ts`:

```typescript
import type { DataMigrationConfig } from "../../../types/migrations";
import type { QuestionsSchemaRowsMap } from "../types";
import type { BatteryInsert, QuestionInsert } from "../schema";
import { fetchS3File } from "../../../scripts/utils/parsers";
import { db } from "../../../index";
import { batteries, questions } from "../schema";

// Define the structure of your S3 data source
type ImpPerfQuestionsJson = {
  prefix_importance: string;
  prefix_performance: string;
  prompts: {
    variable_name: string;
    question_text: string;
    short_text: string;
    category: string;
  }[];
};

// Transformer function: fetches from S3 and transforms to table rows
async function perfImpBatteriesTransformer(
  s3Key: string
): Promise<QuestionsSchemaRowsMap> {
  const questionsJSON = (await fetchS3File(
    s3Key,
    "json"
  )) as ImpPerfQuestionsJson;

  const subBatteries = new Set(
    questionsJSON.prompts.map((prompt) => prompt.category)
  );

  const batteryRows: BatteryInsert[] = [
    {
      name: "dem_chacteristics_importance",
      subBatteries: [...subBatteries],
      prefix: questionsJSON.prefix_importance,
    },
    {
      name: "dem_chacteristics_performance",
      subBatteries: [...subBatteries],
      prefix: questionsJSON.prefix_performance,
    },
  ];

  return {
    batteries: batteryRows,
  };
}

async function perfImpQuestionsTransformer(
  s3Key: string
): Promise<QuestionsSchemaRowsMap> {
  const questionsJSON = (await fetchS3File(
    s3Key,
    "json"
  )) as ImpPerfQuestionsJson;

  const questionRows: QuestionInsert[] = questionsJSON.prompts.map(
    (prompt) => ({
      variableName: prompt.variable_name,
      questionText: prompt.question_text,
      shortText: prompt.short_text,
      category: prompt.category,
    })
  );

  return {
    questions: questionRows,
  };
}

// Rollback function: removes all data inserted by this config
async function perfImpRollback(): Promise<void> {
  await db.delete(questions);
  await db.delete(batteries);
}

// Export the config
export const perfImpConfig: DataMigrationConfig = {
  name: "perfImp",
  schemaName: "questions",
  dataSources: [
    {
      s3Key: "questions/perf-imp.json",
      tableName: "batteries",
      transformer: perfImpBatteriesTransformer,
    },
    {
      s3Key: "questions/perf-imp.json",
      tableName: "questions",
      transformer: perfImpQuestionsTransformer,
    },
  ],
  rollback: perfImpRollback,
};
```

**Key Points:**

- **`name`**: A camelCase identifier for this data migration (e.g., `perfImp`, `userAccounts`)
- **`schemaName`**: The PostgreSQL schema name (must match directory name)
- **`dataSources`**: Array of data sources to process
  - **`s3Key`**: Path to the data file in S3
  - **`tableName`**: Target table name (used for logging and validation)
  - **`transformer`**: Async function that fetches and transforms data
    - Returns a `Record<string, unknown[]>` where keys are table names and values are arrays of rows
    - Can populate multiple tables from a single S3 file
- **`rollback`**: Function to undo the data migration (typically deletes inserted rows)

#### 4. Export Config from Index File

Update `packages/db/src/schemas/<schema-name>/data-migrations/index.ts`:

```typescript
export { perfImpConfig } from "./perf-imp";
// Export other configs as you add them
```

#### 5. Upload Data to S3

Ensure your data files are uploaded to the S3 bucket at the paths specified in your `s3Key` fields.

#### 6. Generate Unified Migration

```bash
npm run db:generate:named "add-questions-with-perf-imp-data"
```

This creates both:

- SQL schema migration file (`0001_add_questions_with_perf_imp_data.sql`)
- TypeScript data migration file (`0001_add_questions_with_perf_imp_data.ts`)

The generator will:

- Auto-discover all data migration configs in `src/schemas/*/data-migrations/`
- Generate imports for all discovered configs
- Create `up()` and `down()` functions that process all configs

#### 7. Review Generated Files

- Check SQL for schema correctness
- Verify data transformation logic in the TypeScript migration
- Ensure S3 keys match uploaded files

#### 8. Apply Migration

```bash
npm run db:migrate
```

This runs both the SQL schema migration and the TypeScript data migration.

#### 9. Commit Everything

```bash
git add packages/db/migrations/ packages/db/src/schemas/ packages/db/data-sources.json
git commit -m "feat: add questions schema with perf-imp data migration"
```

### Data Migration Config Guidelines

**File Naming:**

- Use descriptive names that reflect the data being migrated (e.g., `perf-imp.ts`, `user-accounts.ts`)
- One config file per logical data migration

**Config Naming:**

- The `name` field should be camelCase and describe the data set (e.g., `perfImp`, `userAccounts`)
- This name is used to generate variable names in migration files

**Type Safety:**

- Always define types for your S3 data structure
- Use `InferInsertModel` from Drizzle to get table insert types
- Create schema-specific `RowsMap` types for full type safety

**Transformer Functions:**

- Should be async and fetch data from S3
- Return an object where keys are table names, values are row arrays
- Can populate multiple tables from a single S3 file
- Use the `fetchS3File` utility for consistent S3 access

**Rollback Functions:**

- Should delete all data inserted by the config
- Consider foreign key constraints when ordering deletes
- Be idempotent (safe to run multiple times)

### Best Practices

- ✅ **Always generate migrations** instead of using `drizzle-kit push`
- ✅ **Review migration files** before applying them
- ✅ **Use descriptive migration names**:
  ```bash
  npm run db:generate -- --name "add-battery-subbattery-tables"
  ```
- ✅ **Version control all migration files** - they are part of your application code
- ✅ **Never edit migration files** once they've been applied and committed
- ✅ **Test migrations on development data** before applying to production

### Environment Configuration

Required environment variables in `.env` at the root:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/blw_dataviz
POSTGRES_DB=blw_dataviz
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# AWS Configuration (SSO Profile)
AWS_PROFILE=default
```

**Note**: AWS credentials are managed through AWS SSO rather than static keys. Use `npm run aws:auth` to authenticate.

### Rollback Strategy

Since Drizzle doesn't provide automatic rollbacks, to revert changes:

1. **Create a new migration** that reverses the previous changes
2. **Generate and apply** the rollback migration following the normal workflow
3. **Never delete or modify** existing migration files

### Deployment

For production deployments:

1. Ensure all migrations are committed to version control
2. Run migrations as part of your deployment process
3. Use environment-specific database URLs
4. Consider running migrations in a separate deployment step for zero-downtime deployments
