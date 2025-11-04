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

**NOTE**: To put an admin in the database's admin user's table, use the seed:admin script in the database package!

## api-polls-admin

API for handling transactions by admins for running polls. See package/api-polls-admin/README.md

## integration-tests

Integration tests for API endpoints and database interactions. See packages/integration-tests/README.md for setup and usage.

# Running the System for Development and Testing

The system uses Docker Compose to orchestrate multiple services:

- **postgres**: PostgreSQL database
- **api-polls-admin**: Admin API service (auto-reloads on code changes)

## Prerequisites

1. Copy `.env.example` to `.env` and configure if needed
2. Ensure Docker and Docker Compose are installed

## Starting the System

```bash
# Start all services (database + API) with logs visible
npm run dev

# Start in detached mode (background)
npm run dev:detached

# Or use docker compose directly
docker compose up
docker compose up -d
```

api-polls-admin service will be available at `http://localhost:3003` with hot-reload enabled.

## Development Workflow

If you start the services (`npm run dev`), you can edit source files in `packages/*`, and changes will be automaticaly detected and services will re-load.

**TO DO: Is this true for DB migrations????**

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
