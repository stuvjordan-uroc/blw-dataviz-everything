# Integration Tests

This package contains integration tests for the BLW DataViz APIs and their database interactions.

## What Are Integration Tests?

Unlike unit tests that test individual functions in isolation, integration tests verify that multiple components work together correctly. These tests:

- Start a real NestJS application instance
- Connect to a real PostgreSQL test database
- Make HTTP requests to API endpoints
- Verify database state changes
- Test the full request/response cycle

## Test Database Strategy

Tests use a **dedicated test database** that is:

- Separate from your development database
- Automatically set up with migrations before tests run
- Cleaned between test suites for isolation
- Torn down after tests complete

We use the same schema migrations from the `db` package, ensuring tests run against the exact same database structure as production.

## Prerequisites

1. **Development database running**: Ensure your development database is running via `docker-compose up` or `npm run db:start` from the root
2. **Environment variables**: Make sure you have a `.env` file in the root with `TEST_DATABASE_URL` configured (see `.env.example`)

The test database (`blw_dataviz_test` by default) will be created automatically when you run tests for the first time. Migrations from the `db` package are applied automatically.

## Running Tests

```bash
# From the root of the monorepo
npm run test:integration

# Run in watch mode (re-runs on file changes)
npm run test:integration:watch

# Run with coverage report
npm run test:integration:coverage

# Or from this package directory
npm test
npm run test:watch
npm run test:coverage
```

## Writing New Tests

Integration tests follow this pattern:

1. **Setup**: Start test database and application
2. **Seed**: Add any required test data
3. **Act**: Make HTTP requests to endpoints
4. **Assert**: Check responses and database state
5. **Cleanup**: Clear test data (happens automatically between suites)

See `src/tests/api-polls-admin/auth.test.ts` and `src/tests/api-polls-admin/questions.test.ts` for examples.

## Project Structure

```
integration-tests/
├── src/
│   ├── utils/
│   │   ├── test-db.ts           # Database setup/teardown utilities
│   │   ├── test-app.ts          # NestJS app bootstrap for testing
│   │   └── test-helpers.ts      # Common test helper functions
│   └── tests/
│       └── api-polls-admin/     # Tests for api-polls-admin package
│           ├── auth.test.ts     # Auth endpoint tests
│           └── questions.test.ts # Questions endpoint tests
├── jest.config.js               # Jest configuration
├── package.json
└── README.md
```

## Adding Tests for New APIs

When you add a new API package to the monorepo:

1. Add the new API package as a dependency in `package.json`
2. Create a new directory under `src/tests/` for the API (e.g., `src/tests/api-new-feature/`)
3. Create test files in that directory (e.g., `src/tests/api-new-feature/endpoints.test.ts`)
4. Use the test utilities to bootstrap the app and database
5. Write your test cases following the patterns in `src/tests/api-polls-admin/`

The test infrastructure is designed to be reusable across all APIs in the monorepo. Tests are organized by API to keep them maintainable as the monorepo grows.
