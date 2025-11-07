# Computation Tests

This directory contains unit tests for the computation functions in `shared-computation`.

## Test Data Architecture

The tests use a **hybrid approach** that combines:

1. **Human-readable CSV data** with inline comments
2. **Type-safe expected results** defined in TypeScript
3. **ASCII tables in test comments** for visual clarity

This makes it easy for humans to:

- **Understand the test data** at a glance
- **Verify the calculations** by hand
- **Debug failing tests** with clear expected values

## Data Files

### `fixtures/mock-responses.csv`

Contains mock respondent data in rectangular format with:

- Inline comments showing what each respondent represents
- Invalid respondents marked with explanations
- Clear mapping to response values

Example:

```csv
respondent_id,weight,party,age_group,approval,anger
1,1.5,0,0,0,1    # Democrat, 18-34, Strongly Approve, irritated
6,,,0,1,1        # INVALID: missing weight AND party
```

### `fixtures/mock-data.ts`

The **single source of truth** for test expectations. Contains:

1. **CSV Parser** - Converts CSV to `ResponseData[]`
2. **Session Config** - Defines questions and response groups
3. **Expected Results** - Hand-calculated values with inline math

All expected values include explanatory comments showing the calculation:

```typescript
"Strongly Approve": 1.5 / 2.3,  // R1 weight
```

## Understanding the Test Data

### Valid Respondents (used in calculations)

| ID  | Weight | Party      | Age   | Approval            | Anger     |
| --- | ------ | ---------- | ----- | ------------------- | --------- |
| 1   | 1.5    | Democrat   | 18-34 | Strongly Approve    | irritated |
| 2   | 0.8    | Democrat   | 35-54 | Somewhat Approve    | none      |
| 3   | 2.0    | Republican | 18-34 | Strongly Disapprove | aflame    |
| 4   | 1.2    | Republican | 55+   | Somewhat Disapprove | hot       |
| 5   | 1.0    | Democrat   | 55+   | Strongly Approve    | hot       |

### Invalid Respondents (filtered out)

| ID  | Reason for Exclusion                           |
| --- | ---------------------------------------------- |
| 6   | Missing party (required grouping question)     |
| 7   | Missing age_group (required grouping question) |
| 8   | Invalid approval value (5 not in valid range)  |

## Example Calculation Walkthrough

### Split: Democrat × 18-34 OR 35-54

**Matching respondents:** 1, 2 (party=0 AND age_group IN [0,1])

#### Unweighted Calculation

- **n = 2**
- **Approval - Strongly Approve:**
  - Respondent 1 has approval=0 → 1 respondent
  - 1 / 2 = **0.5**
- **Approval - Somewhat Approve:**
  - Respondent 2 has approval=1 → 1 respondent
  - 1 / 2 = **0.5**

#### Weighted Calculation

- **effectiveN = 1.5 + 0.8 = 2.3**
- **Approval - Strongly Approve:**
  - Respondent 1 (weight=1.5) has approval=0
  - 1.5 / 2.3 = **0.6522**
- **Approval - Somewhat Approve:**
  - Respondent 2 (weight=0.8) has approval=1
  - 0.8 / 2.3 = **0.3478**

## Test Structure

Each test includes:

1. **ASCII Table** - Visual reference of relevant data
2. **Inline Calculation** - Shows expected math
3. **Assertions** - Verifies code matches expectations

Example:

```typescript
test("should compute correct proportions", () => {
  /**
   * Split: Democrat × 18-34 OR 35-54
   * Matching respondents: 1, 2
   *
   * UNWEIGHTED Expected:
   * - Strongly Approve: 1/2 = 0.5
   * - Somewhat Approve: 1/2 = 0.5
   */

  const result = populateSplitStatistics(...);
  const expected = expectedSplitStatistics["Democrat × 18-34 OR 35-54"];

  expect(result.approval).toBeCloseTo(expected.approval, 10);
});
```

## Adding New Test Cases

To add new test cases:

1. **Update `mock-responses.csv`** - Add new respondent rows with inline comments
2. **Update `expectedRespondentRecords`** - Add to included/excluded lists
3. **Update `expectedSplitStatistics`** - Hand-calculate proportions with inline math
4. **Add test case** - Include ASCII table and reference expected values

## Benefits of This Approach

✅ **Type Safety** - TypeScript catches errors in expected values  
✅ **Human Readable** - Tables and comments make data clear  
✅ **Single Source of Truth** - Expected results defined once  
✅ **Easy Debugging** - See what was expected and why  
✅ **Self-Documenting** - Tests explain the domain logic

## Running Tests

```bash
npm test
```

To run only computation tests:

```bash
npm test computations
```

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
