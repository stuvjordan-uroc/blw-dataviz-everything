# Integration Tests

This package contains integration tests for the BLW DataViz APIs running in containerized environments.

## What Are Integration Tests?

Unlike unit tests that test individual functions in isolation, integration tests verify that multiple components work together correctly. These tests:

- Make HTTP requests to the **actual API running in a Docker container**
- Verify responses against a **real PostgreSQL test database**
- Test the full request/response cycle in an environment that mirrors production
- Ensure database state changes are correct

## Architecture

The new test architecture mirrors your development environment:

- **Test Database Container** (`blw-postgres-test`): Dedicated PostgreSQL instance on port 5433
- **Test API Container** (`blw-api-polls-admin-test`): Real API service on port 3004
- **Test Runner** (local): Jest runs locally and makes HTTP requests to the containerized API
- **Direct DB Access**: Tests can seed data and verify state via direct database connections

This approach ensures tests run against the same containerized setup that production uses.

## Prerequisites

1. **Docker and Docker Compose**: Required to run the test containers
2. **AWS Credentials**: For data migrations (if using S3-based seed data)

## Running Tests

The test workflow exactly parallels the dev workflow:

### Complete Workflow (Single Terminal)

```bash
# From the root of the monorepo

# 1. Start the test environment in detached mode (database + API containers with schema migrations)
npm test -- -d

# 2. Populate the test database with data migrations
npm run test:db-populate

# 3. Run the integration tests
npm run test:run

# 4. Stop the test environment when done
docker compose -f docker-compose.test.yml down
```

### Alternative: Foreground Mode

If you want to see container logs in real-time:

```bash
# Terminal 1: Start containers (blocks, shows logs)
npm test

# Terminal 2: Populate and run tests
npm run test:db-populate
npm run test:run
```

This mirrors the dev workflow:

- `npm run dev` → `npm test` (start containers)
- `npm run dev:db-populate` → `npm run test:db-populate` (populate data)
- (run your app) → `npm run test:run` (run tests)

## Test Database Strategy

Tests use a **dedicated test database** that is:

- Separate from your development database (`blw_dataviz_test` vs `blw_dataviz`)
- Running in its own Docker container on port **5433** (dev uses 5432)
- Automatically set up with schema migrations when containers start
- Manually populated with data migrations via `npm run test:db-populate`
- Cleaned between test suites via `afterEach` hooks in test files

The test API connects to this test database, ensuring complete isolation from development data.

## Writing New Tests

Integration tests follow this pattern:

1. **Prerequisites**: Test environment is running (`npm test`) and populated (`npm run test:db-populate`)
2. **Setup**: `beforeAll` hook fetches real data from database or uses data migration defaults
3. **Act**: Make HTTP requests to the containerized API (`http://localhost:3004`)
4. **Assert**: Check responses and optionally verify database state
5. **Cleanup**: `afterEach` hook clears test data for isolation between tests

Example pattern:

```typescript
import request from "supertest";
import { sql } from "drizzle-orm";
import { getTestDb, getTestApiUrl } from "../../utils/test-helpers";

describe("My Feature Tests", () => {
  const apiUrl = getTestApiUrl(); // http://localhost:3004
  let authToken: string;

  beforeAll(async () => {
    // Login using admin from data migrations
    const response = await request(apiUrl).post("/auth/login").send({
      email: "admin@dev.local",
      password: "dev-password-changeme",
    });

    authToken = response.body.accessToken;
  });

  afterEach(async () => {
    const { db, cleanup } = getTestDb();
    try {
      // Clean up test data
      await db.execute(sql`TRUNCATE TABLE my_table CASCADE`);
    } finally {
      await cleanup();
    }
  });

  it("should do something", async () => {
    const response = await request(apiUrl)
      .get("/my-endpoint")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty("data");
  });
});
```

See `src/tests/api-polls-admin/sessions-workflow.test.ts` and `src/tests/auth/auth.test.ts` for complete examples.

## Project Structure

```
integration-tests/
├── src/
│   ├── utils/
│   │   └── test-helpers.ts      # Utilities for DB access and data seeding
│   └── tests/
│       ├── api-polls-admin/     # Tests for api-polls-admin package
│       │   └── sessions-workflow.test.ts
│       └── auth/
│           └── auth.test.ts     # Authentication endpoint tests
├── jest.config.js               # Jest configuration
├── jest.setup.js                # Jest setup (runs before tests)
├── package.json
└── README.md
```

## Comparison with Old Approach

### Old Approach (Deprecated)

- Tests created test database connection and spawned NestJS app instances
- Required complex test-app.ts and test-db.ts infrastructure
- Tests had full control but added complexity
- Each test suite set up and tore down its own app

### New Approach (Current)

- Tests run against containerized API and database (just like dev/prod)
- Simpler test code - just HTTP requests via supertest
- Better mirrors production environment
- Single API instance serves all tests (faster)
- Easier to debug - can inspect containers directly

## Troubleshooting

### Tests fail with connection errors

Ensure test containers are running:

```bash
docker ps | grep blw-.*-test
```

You should see:

- `blw-postgres-test` (database)
- `blw-api-polls-admin-test` (API)

If not running, start them:

```bash
npm test
```

### Tests fail with "table doesn't exist" or "migration" errors

Run data migrations:

```bash
npm run test:db-populate
```

### Need to reset everything

```bash
# Stop containers and remove volumes
docker compose -f docker-compose.test.yml down -v

# Start fresh
npm test                    # Start containers
npm run test:db-populate    # Populate data
npm run test:run            # Run tests
```

### View API logs

```bash
docker logs blw-api-polls-admin-test -f
```

## Adding Tests for New APIs

When you add a new API package to the monorepo:

1. Add a new service to `docker-compose.test.yml` for the new API
2. Create a new directory under `src/tests/` (e.g., `src/tests/api-new-feature/`)
3. Write tests that make HTTP requests to the containerized API
4. Update `test:run` script if needed to pass different `TEST_API_URL`

The test infrastructure is designed to support multiple APIs running in containers.
