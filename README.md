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
    └── db/                 # Database package with schema, migrations, seeding
        ├── src/
        │   ├── index.ts    # Database connection and exports
        │   └── schema/     # Drizzle schema definitions and data migration source files
        ├── migrations/     # Generated SQL schema migration and ts data migration files
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

This project uses Drizzle ORM with PostgreSQL for database management. We follow a **unified migration approach** that combines both schema and data migrations into single, versioned units. Data sources are stored in S3 and referenced through configuration files.

### Data Source Management

Instead of storing data files in the repository, we use S3 for data source storage:

- **S3 Configuration**: Defined in `packages/db/data-sources.json`
- **Data Sources**: Raw CSV and JSON files stored in S3 bucket
- **Migration Integration**: Data transformations defined alongside schema in TypeScript files

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

1. **Update schema** in `packages/db/src/schema/` files (e.g., `questions.ts`)

2. **Define data transformations** in the same schema file:

   ```typescript
   export const questionsMigrationConfig = {
     name: "questions",
     dataSources: [
       {
         s3Key: "questions/batteries.json",
         target: "batteries",
         transformer: transformBatteries,
       },
     ],
     rollback: rollbackQuestionsData,
   };
   ```

3. **Upload data sources** to S3 bucket as specified in `data-sources.json`

4. **Generate unified migration**:

   ```bash
   npm run db:generate:named "add-questions-with-batteries"
   ```

   This creates both:

   - SQL schema migration file (`0001_add_questions.sql`)
   - TypeScript data migration file (`0001_add_questions.ts`)

5. **Review generated files**:

   - Check SQL for schema correctness
   - Verify data transformation logic
   - Ensure S3 keys match uploaded files

6. **Apply migration**:

   ```bash
   npm run db:migrate
   ```

7. **Commit everything**:
   ```bash
   git add packages/db/migrations/ packages/db/src/schema/ packages/db/data-sources.json
   git commit -m "feat: add questions schema and data migration"
   ```

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
