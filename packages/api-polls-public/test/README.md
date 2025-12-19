# API Polls Public - Test Suite

This directory contains the test configuration and infrastructure for the `api-polls-public` package.

## Test Structure

```
test/
├── jest.config.js      # Jest configuration
├── jest.setup.js       # Global test setup and utilities
└── README.md           # This file

src/
├── responses/
│   ├── response-transformer.service.spec.ts    # Unit tests
│   ├── visualization-cache.service.spec.ts     # (To be created)
│   ├── batch-update-scheduler.service.spec.ts  # (To be created)
│   └── ...
└── ...
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:cov

# Debug tests
npm run test:debug
```

## Test Types

### 1. Unit Tests (`.spec.ts`)

- Test individual services in isolation
- Mock all dependencies
- Fast execution
- Located next to source files

**Example:** `response-transformer.service.spec.ts` tests the transformation logic with mocked dependencies.

### 2. Integration Tests (`.integration.spec.ts`)

- Test multiple services working together
- Use NestJS Testing module
- Real EventEmitter but mocked database
- Medium execution speed

**Example:** Testing the flow from response submission → cache update → event emission.

### 3. E2E Tests

- Located in `packages/integration-tests`
- Test full HTTP request/response cycle
- Real containerized services
- Slowest execution

## Writing Tests

### Unit Test Template

```typescript
import { ServiceToTest } from "./service-to-test.service";

describe("ServiceToTest", () => {
  let service: ServiceToTest;
  let mockDependency: jest.Mocked<Dependency>;

  beforeEach(() => {
    mockDependency = {
      method: jest.fn(),
    } as any;

    service = new ServiceToTest(mockDependency);
  });

  describe("methodName", () => {
    it("should do something", () => {
      // Arrange
      const input = {
        /* ... */
      };
      mockDependency.method.mockResolvedValue({
        /* ... */
      });

      // Act
      const result = service.methodName(input);

      // Assert
      expect(result).toBeDefined();
      expect(mockDependency.method).toHaveBeenCalledWith(/* ... */);
    });
  });
});
```

### Integration Test Template

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitterModule } from "@nestjs/event-emitter";

describe("Service Integration", () => {
  let module: TestingModule;
  let service1: Service1;
  let service2: Service2;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        Service1,
        Service2,
        {
          provide: "DATABASE_CONNECTION",
          useValue: createMockDatabase(),
        },
      ],
    }).compile();

    service1 = module.get(Service1);
    service2 = module.get(Service2);
  });

  afterEach(async () => {
    await module.close();
  });

  it("should coordinate between services", async () => {
    // Test interaction between services
  });
});
```

## Global Test Utilities

The `jest.setup.js` file provides global test utilities:

### `createMockDatabase()`

Creates a mocked database connection with Drizzle-like interface:

```typescript
const mockDb = createMockDatabase();
mockDb.select.mockReturnValue(/* ... */);
```

### `createMockSSEResponse()`

Creates a mocked Express Response for testing SSE:

```typescript
const mockResponse = createMockSSEResponse();
expect(mockResponse.write).toHaveBeenCalledWith(/* ... */);
```

## Testing Best Practices

1. **Arrange-Act-Assert Pattern**: Structure tests clearly with setup, execution, and verification

2. **Mock External Dependencies**: Database, HTTP clients, external services

3. **Test Edge Cases**: Empty inputs, null values, invalid data

4. **Use Fake Timers**: For testing scheduled/batched operations

   ```typescript
   beforeEach(() => jest.useFakeTimers());
   afterEach(() => jest.useRealTimers());
   ```

5. **Clean Up**: Always clean up resources in `afterEach` or `afterAll`

6. **Descriptive Names**: Test names should clearly state what is being tested

7. **Single Responsibility**: Each test should verify one behavior

## Coverage Goals

- **Branches**: 70%
- **Functions**: 75%
- **Lines**: 80%
- **Statements**: 80%

Coverage thresholds are configured in `jest.config.js` and enforced on test runs.

## Debugging Tests

To debug a specific test:

```bash
# Run with Node inspector
npm run test:debug

# Then open chrome://inspect in Chrome
# Set breakpoints in your test or source code
```

Or use VS Code's built-in debugger by adding a launch configuration.

## CI/CD Integration

Tests should run as part of the CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run unit tests
  run: npm test
  working-directory: packages/api-polls-public

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: packages/api-polls-public/test/coverage/lcov.info
```

## Key Testing Scenarios for This Package

### Response Submission Flow

1. Client submits responses
2. Responses are queued for batch processing
3. After 3s, batch processes and updates cache
4. Cache increments sequence number
5. Event is emitted with fromSequence/toSequence
6. SSE clients receive update

### SSE Streaming

1. Client connects to stream endpoint
2. Receives initial snapshot with sequence number
3. Receives updates with both full state and diffs
4. Can detect missed updates via sequence gaps
5. Handles client disconnection gracefully

### Visualization Cache Wake/Sleep

1. First access loads from database
2. Subsequent accesses use cached state
3. After inactivity, cache is cleared
4. Next access reloads from database

## Next Steps

To complete the test suite, create:

1. `visualization-cache.service.spec.ts` - Test wake/sleep cycles, sequence tracking
2. `batch-update-scheduler.service.spec.ts` - Test batching, timing, event emission
3. `visualization-stream.service.spec.ts` - Test SSE client management, broadcasting
4. `responses-services.integration.spec.ts` - Test end-to-end coordination
5. Add E2E tests in `integration-tests` package for streaming workflow
