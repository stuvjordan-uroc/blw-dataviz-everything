# Packages

## db

database. See packages/db/README.md

## shared-schemas

- schema source files for database tables -- used by db package to generate schema migrations.
- exports typescript types representing tables and schemas for use by other packages.
- zod schemas for validating json input/output for database, exported for used by api packages

See packages/shared-schemas/README.md

## shared-auth

Utilities for authenticating admins. Exported for use by APIs in the project. See packages/shared-auth/README.md

**NOTE**: Development admin users are automatically seeded when you run `npm run dev:db-populate`. In production, admin users should be created through proper user management processes.

## api-polls-admin

API for handling transactions by admins for running polls. See package/api-polls-admin/README.md

## integration-tests

Integration tests for API endpoints and database interactions. See packages/integration-tests/README.md for setup and usage.

# Running the System for Development and Testing

## Prerequisites

1. Copy `.env.example` to `.env` and configure if needed
2. Ensure Docker and Docker Compose are installed

## Development Workflow

There are two high-level parts to the sytems in the repo that have to be developed separately: First the database defined at packages/db. Second all APIs and frontend that serve as interfaces to the tables in the DB.

In any environment -- whether development, testing, or production -- the APIs and frontend cannot function as designed _until_ the database is up-and-running and populated with schemas and data.

This means two things:

(1) When you want to run or test the APIs and/or frontend, you have to spin up the databse and run schema and data migrations on it.

(2) When you make changes to the schema or data with which database should be populated, you need to implement these changes through migrations before running the APIs and/or frontend again.

Here's the basic workflow:

1. **Start the system:** Run `npm run dev`. This starts the database and APIs in containers and automatically runs schema migrations from `packages/db/schema-migrations/`. The result is a running database with all required tables, but no rows in those tables.

2. **Populate the database:** Run `npm run dev:db-populate`. This single command authenticates with AWS and runs all data migrations (including development admin user seeding). After this, the database is fully populated.

3. **Develop and test:** The APIs can now interact with the database as designed. API containers auto-reload when you change source code, so you can develop and immediately test changes.

**When making schema changes:** Shut down dev processes, update schema source files in `packages/shared-schemas/src/schemas/`, generate migrations with `npm run db:generate --workspace=db`, then restart with `npm run dev`.

## Database Migrations

### Schema Migrations (Automatic on Startup)

Schema migrations are **automatically applied** when you start the system with `npm run dev`. The `db-migrate` service:

- Runs after the postgres container is healthy
- Applies any pending schema migrations from `packages/db/schema-migrations/`
- Exits after completion (won't re-run automatically)

**When you create new schema migrations:**

1. Generate migration: `npm run db:generate --workspace=db`
2. Apply manually: `npm run db:migrate` (or restart the system)
3. Or restart db-migrate service: `docker compose up db-migrate`

### Data Migrations & Seeding (Manual - One Command)

Data migrations populate the database with data from S3 and include development admin user seeding.

**Quick start:**

```bash
# Single command - handles AWS auth and all data migrations
npm run dev:db-populate
```

This command:

1. Authenticates with AWS (interactive)
2. Runs all data migrations from S3
3. Seeds development admin users (automatically skipped in production)

**Advanced usage:**

```bash
# Just authenticate (if you want to run migrations separately)
npm run aws:auth

# Run data migrations manually
npm run db:migrate:data

# Run migrations for specific schema only
npm run db:migrate:data --workspace=db -- questions
```

See `packages/db/README.md` for detailed migration documentation.

## Stopping the System

```bash
npm run dev:stop
```

## Useful Commands

```bash
# View logs for all services
npm run dev:logs

# View logs for specific service
docker compose logs -f api-polls-admin
docker compose logs -f postgres

# Rebuild API image (after dependency changes)
docker compose build api-polls-admin

```

# Adding new shared packages

When creating a new shared package that exports code for use by other packages (like `shared-auth` or `shared-schemas`), follow these steps:

## 1. Create the Package Structure

```bash
mkdir -p packages/your-package-name/src
cd packages/your-package-name
```

## 2. Create package.json

Set up the package.json with proper build scripts:

```json
{
  "name": "your-package-name",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch"
  },
  "dependencies": {
    // your dependencies
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.9.3"
  }
}
```

**Important**:

- `main` and `types` must point to `dist/` (compiled output)
- Must include both `build` and `build:watch` scripts
- The `build:watch` script enables automatic rebuilding during development

## 3. Create tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

## 4. Create src/index.ts

Export your package's public API:

```typescript
export * from "./your-module";
// export other modules
```

## 5. Update Dockerfile

Edit `packages/api-polls-admin/Dockerfile` (or relevant API's Dockerfile) to include your package in the development stage:

```dockerfile
# Add package.json
COPY packages/your-package-name/package*.json ./packages/your-package-name/

# Add tsconfig.json
COPY packages/your-package-name/tsconfig.json ./packages/your-package-name/

# Add source code
COPY packages/your-package-name/src ./packages/your-package-name/src

# Add build command
RUN npm run build --workspace=your-package-name
```

## 6. Update docker-compose.yml

Add a volume mount for hot-reload during development:

```yaml
api-polls-admin:
  # ... existing config
  volumes:
    - ./packages/api-polls-admin/src:/app/packages/api-polls-admin/src
    - ./packages/shared-auth/src:/app/packages/shared-auth/src
    - ./packages/shared-schemas/src:/app/packages/shared-schemas/src
    - ./packages/your-package-name/src:/app/packages/your-package-name/src # Add this
```

## 7. Rebuild Docker Image

After adding the package, rebuild the Docker image:

```bash
docker compose down
docker compose up --build
```

## Auto-discovery Feature

The development startup script (`dev-start.sh`) automatically detects and starts watch mode for all workspace packages that have a `build:watch` script. You don't need to manually modify the startup script when adding new shared packages - just ensure your package.json includes the `build:watch` script.
