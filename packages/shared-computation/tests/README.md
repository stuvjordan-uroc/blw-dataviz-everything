# Tests for shared-computation

This directory contains unit tests for the shared-computation package.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

### `fixtures/mock-responses.csv`

Human-readable CSV file containing mock response data in rectangular format (one row per respondent, one column per question). This makes it easy to visualize patterns in the data.

**Format:**

```
respondent_id,weight,party,age_group,approval,anger
1,1.5,0,0,0,1
2,0.8,0,1,1,0
...
```

Lines starting with `#` are treated as comments. The CSV includes a `weight` column for all respondents, allowing tests to use the same data for both weighted and unweighted computations.

### `fixtures/mock-data.ts`

Contains mock data loading and configuration:

- **loadMockResponsesFromCsv()**: Parses the CSV file and converts it to `ResponseData[]` format
- **getAllMockResponses()**: Returns all responses including weights (cached for performance)
- **getMockResponses()**: Returns responses without weights (for unweighted tests)
- **getMockWeights()**: Returns only weight responses
- **mockSessionConfig**: Session configuration with grouping questions (party, age_group) and response questions (approval, anger)
- **mockWeightQuestion**: QuestionKey identifying the weight question
- **Helper functions**: `createMockResponse()` and `createSimpleSessionConfig()` for creating custom test data

**Legacy exports** (`mockResponses`, `mockWeightedResponses`) are maintained for backward compatibility but are deprecated.

### `computations.test.ts`

Tests for core computation functions:

- Question key creation and parsing
- Response grouping and filtering
- Split statistics computation (weighted and unweighted)
- Empty statistics generation

### `update-statistics.test.ts`

Tests for incremental update functions:

- Incremental proportion updates (weighted and unweighted)
- Split validation against session configuration
- Handling of new respondents and edge cases

## Test Data Overview

The mock data represents a simple poll scenario with 4 respondents:

| ID  | Weight | Party | Age Group | Approval            | Anger     |
| --- | ------ | ----- | --------- | ------------------- | --------- |
| 1   | 1.5    | Dem   | 18-34     | Strongly Approve    | irritated |
| 2   | 0.8    | Dem   | 35-54     | Somewhat Approve    | none      |
| 3   | 2.0    | Rep   | 18-34     | Strongly Disapprove | aflame    |
| 4   | 1.2    | Rep   | 55+       | Somewhat Disapprove | hot       |

**Grouping Questions:**

- Party affiliation: Democrat (0) / Republican (1)
- Age group: 18-34 OR 35-54 (0,1) / 55+ (2)

**Response Questions:**

- Policy approval: 4-point scale (Strongly Approve=0, Somewhat Approve=1, Somewhat Disapprove=2, Strongly Disapprove=3)
  - Expanded groups: Each response value separate
  - Collapsed groups: Approve (0,1) / Disapprove (2,3)
- Anger: 4-point scale (none=0, irritated=1, hot=2, aflame=3)
  - Expanded groups: Each response value separate
  - Collapsed groups: some (0,1) / a lot (2,3)

## Writing Tests

When writing tests:

1. **Use CSV-based mock data**: Call `getMockResponses()` for unweighted tests or `getAllMockResponses()` for weighted tests
2. **Test both weighted and unweighted scenarios**: The same data can be used by passing/omitting the `weightQuestion` parameter
3. **Modify CSV for new scenarios**: Edit `mock-responses.csv` to add more respondents or change response patterns
4. **Test edge cases**: Empty data, missing weights, null responses, etc.
5. **Verify proportions**: Ensure proportions sum to expected values and match manual calculations
6. **Check split generation**: Verify splits are generated correctly based on grouping criteria
