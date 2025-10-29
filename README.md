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

Define your PostgreSQL schema and tables in `packages/db/src/schemas/<schema-name>/schema.ts`. For example, here are the definitions for the tables in the questions schema at packages/db/sr/schemas/questions/schema.ts

```typescript
import { pgSchema, text, check, serial, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";

/* CREATE QUESTIONS SCHEMA AND ITS TABLES */

//schema
export const questionsSchema = pgSchema("questions");

//batteries table
export const batteries = questionsSchema.table("batteries", {
  name: text().notNull().primaryKey(),
  prefix: text(),
});

//sub-batteries table

export const subBatteries = questionsSchema.table(
  "sub_batteries",
  {
    id: serial("id").primaryKey(),
    batteryName: text()
      .notNull()
      .references(() => batteries.name),
    name: text().notNull(),
  },
  (table) => [
    //insure that the set of sub-batteries belonging to any battery has no duplicates.
    unique().on(table.batteryName, table.name),
  ]
);

//questions table
export const questions = questionsSchema.table(
  "questions",
  {
    varName: text().notNull().primaryKey(),
    text: text(),
    batteryName: text()
      .notNull()
      .references(() => batteries.name),
    subBattery: text().references(() => subBatteries.name),
    responses: text().array(), //index in this array will give coded response in responses table
  },
  (table) => [
    //make sure that the subBattery for each row belongs to the battery for that row
    check(
      "sub_battery_belongs_to_battery",
      sql`
        -- If subBattery is null, allow it
        -- Otherwise, ensure it exists in sub_batteries table for the correct battery
        ${table.subBattery} IS NULL 
        OR EXISTS(
          SELECT 1 
          FROM ${subBatteries}
          WHERE ${subBatteries.name} = ${table.subBattery}
            AND ${subBatteries.batteryName} = ${table.batteryName}
        )
      `
    ),
  ]
);

export type BatteryInsert = InferInsertModel<typeof batteries>;
export type SubBatteryInsert = InferInsertModel<typeof subBatteries>;
export type QuestionInsert = InferInsertModel<typeof questions>;
```

Notice the exported types. These are useful for the data migration configs that are specific to the schema.

#### 3. Add or Update Data Migration Configs

To migrate data into the tables in a schema, create a data migration config file in `packages/db/src/schemas/<schema-name>/data-migrations/<migration-name>.ts`.

For example, here is the migration config that populates the perf- and imp- questions in the tables in the questions schema:

```typescript
import type {
  DataMigrationConfig,
  TableRowsMap,
} from "../../../types/migrations";
import {
  type BatteryInsert,
  type SubBatteryInsert,
  type QuestionInsert,
  batteries,
  subBatteries,
  questions,
} from "../schema";
import { fetchS3File } from "../../../scripts/utils";
import { db } from "../../../index";
import { eq } from "drizzle-orm";

export const config: DataMigrationConfig = {
  name: "perfImpQuestions",
  schemaName: "questions",
  dataSources: [
    {
      s3Key: "db/schemas/question/perf-imp.json",
      tableName: "batteries",
      transformer: perfImpBatteriesTransformer,
    },
    {
      s3Key: "db/schemas/question/perf-imp.json",
      tableName: "sub_batteries",
      transformer: perfImpSubBatteriesTransformer,
    },
    {
      s3Key: "db/schemas/question/perf-imp.json",
      tableName: "questions",
      transformer: perfImpQuestionsTransformer,
    },
  ],
  rollback: perfImpRollback,
};

const impBatteryName = "democratic_characteristics_performance";
const perfBatteryName = "democratic_characteristics_importance";

type ImpPerfQuestionsJson = {
  importance: {
    prefix: string;
    responses: string[];
  };
  performance: {
    prefix: string;
    responses: string[];
  };
  characteristics: {
    variable_name: string;
    question_text: string;
    short_text: string;
    category: string;
  }[];
};

async function perfImpBatteriesTransformer(
  s3Key: string
): Promise<TableRowsMap> {
  const questionsJSON = (await fetchS3File(
    s3Key,
    "json"
  )) as ImpPerfQuestionsJson;
  const rows = [
    {
      name: impBatteryName,
      prefix: questionsJSON.importance.prefix,
    },
    {
      name: perfBatteryName,
      prefix: questionsJSON.performance.prefix,
    },
  ] as BatteryInsert[];
  return {
    batteries: rows,
  };
}

async function perfImpSubBatteriesTransformer(
  s3Key: string
): Promise<TableRowsMap> {
  const questionsJSON = (await fetchS3File(
    s3Key,
    "json"
  )) as ImpPerfQuestionsJson;
  const uniqueSubBatteries = [
    ...new Set(questionsJSON.characteristics.map((char) => char.category)),
  ];
  const rows: SubBatteryInsert[] = [
    ...uniqueSubBatteries.map((sb) => ({
      batteryName: impBatteryName,
      name: sb,
    })),
    ...uniqueSubBatteries.map((sb) => ({
      batteryName: perfBatteryName,
      name: sb,
    })),
  ];
  return {
    subBatteries: rows,
  };
}

async function perfImpQuestionsTransformer(
  s3Key: string
): Promise<TableRowsMap> {
  const questionsJSON = (await fetchS3File(
    s3Key,
    "json"
  )) as ImpPerfQuestionsJson;
  const rows: QuestionInsert[] = questionsJSON.characteristics
    .map((char) => ({
      varName: "imp_" + char.variable_name,
      text: char.question_text,
      batteryName: impBatteryName,
      subBattery: char.category,
      responses: questionsJSON.importance.responses,
    }))
    .concat(
      questionsJSON.characteristics.map((char) => ({
        varName: "perf_" + char.variable_name,
        text: char.question_text,
        batteryName: perfBatteryName,
        subBattery: char.category,
        responses: questionsJSON.performance.responses,
      }))
    );
  return {
    questions: rows,
  };
}

async function perfImpRollback(): Promise<void> {
  // Delete in reverse order of insertion to respect foreign key constraints

  // 1. Remove all questions from both batteries
  await db.delete(questions).where(eq(questions.batteryName, perfBatteryName));
  await db.delete(questions).where(eq(questions.batteryName, impBatteryName));

  // 2. Remove all sub-batteries from both batteries
  await db
    .delete(subBatteries)
    .where(eq(subBatteries.batteryName, perfBatteryName));
  await db
    .delete(subBatteries)
    .where(eq(subBatteries.batteryName, impBatteryName));

  // 3. Remove both batteries
  await db.delete(batteries).where(eq(batteries.name, perfBatteryName));
  await db.delete(batteries).where(eq(batteries.name, impBatteryName));

  console.log("Rollback completed for perfImp migration");
}
```

**Key Points:**

A datamigration config must export a `DataMigrationConfig` object. This give a name to the migration (`name`), the name of the schema targeted by the migration (`schemaName`), an array of object specifying data sources and how to transform them to form table rows (`dataSources`), and a rollback function (`rollback`) for rolling back the migration.

Each object in the `dataSources` array specfies the key of the s3 object where the source data is stored, the `tableName` of the table targeted by that object, and the transformer (a function) that takes the source data and transforms it into rows for the targeted table.

#### 4. Export Config from Index File

Whenever you add a new data migration file (e.g. perf-imp.ts), re-exported it from `packages/db/src/schemas/<schema-name>/data-migrations/index.ts`:

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
