# Test Maintenance Guide

This guide explains how to maintain and extend the computation tests.

## Quick Reference

- **Run tests:** `npm test`
- **Run specific test:** `npm test computations.test.ts`
- **Generate report:** `npm run test:report`
- **Watch mode:** `npm run test:watch`

## Architecture Overview

The test system uses a **three-layer approach**:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CSV Data (Human-Readable)                               │
│    - mock-responses.csv                                     │
│    - Inline comments showing what each row represents       │
│    - MISSING sentinel for testing missing entries           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Expected Results (Type-Safe Single Source of Truth)     │
│    - fixtures/mock-data.ts                                  │
│    - Hand-calculated values with inline math comments       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Test Assertions (Visual Documentation)                  │
│    - computations.test.ts                                   │
│    - ASCII tables and explanatory comments                  │
│    - Tests for null responses AND missing entries           │
└─────────────────────────────────────────────────────────────┘
```

## Working with Missing Data

The test system supports **two types of missing data**:

### 1. Null Response (element exists with null value)

```csv
7,1.1,0,,1,0     # Empty age_group → creates element with response=null
```

### 2. Missing Entry (no element created)

```csv
9,1.4,MISSING,1,1,0    # MISSING party → no element created at all
```

**When to use each:**

- Use **null/empty** to test behavior when ResponseData element exists but is null
- Use **MISSING** to test behavior when no ResponseData element exists at all

## Making Changes

### Adding a New Respondent

1. **Update CSV** (`fixtures/mock-responses.csv`):

   ```csv
   # Valid respondent
   11,1.3,1,1,2,0    # Republican, 35-54, Somewhat Disapprove, none

   # Invalid respondent with null response
   12,,,1,1,0        # Null weight and party (elements exist with null)

   # Invalid respondent with missing entry
   13,1.2,MISSING,1,1,0    # MISSING party (no element created)
   ```

2. **Update expected results** (`fixtures/mock-data.ts`):

   ```typescript
   withoutWeight: {
     includedIds: [1, 2, 3, 4, 5, 11],  // Add valid respondent
     excludedIds: [6, 7, 8, 9, 10, 12, 13],  // Add invalid respondents
     totalCount: 6,  // Increment for valid only
     explanation: {
       excluded: {
         // ... existing exclusions
         12: "Null weight and party (null elements) - ...",
         13: "Missing party (no element) - ...",
       }
     }
   }
   ```

3. **Recalculate split statistics**:

   - Run `npm run test:report` to see current calculations
   - Update `expectedSplitStatistics` for affected splits
   - Add inline math comments showing the calculation

4. **Run tests** to verify:
   ```bash
   npm test
   ```

### Adding a New Test Case

1. **Add test to `computations.test.ts`**:

   ```typescript
   test("should handle edge case X", () => {
     /**
      * Test Case: Description
      * Data: ...
      *
      * Expected:
      * - Result A: calculation
      * - Result B: calculation
      */

     const result = functionUnderTest(...);
     expect(result).toEqual(expected);
   });
   ```

2. **Add expected values to `mock-data.ts`** if needed

3. **Document the test case** in test comments

### Modifying Session Config

If you change questions or response groups:

1. **Update `mockSessionConfig`** in `fixtures/mock-data.ts`

2. **Regenerate all expected values**:

   - Use `npm run test:report` to see what changed
   - Manually calculate new proportions
   - Update `expectedSplitStatistics` with new values

3. **Update test comments** to reflect new structure

4. **Verify all tests pass**

## Best Practices

### ✅ DO

- **Always include inline math** in expected values

  ```typescript
  "Strongly Approve": 1.5 / 2.3,  // R1 weight = 1.5, total = 2.3
  ```

- **Use ASCII tables** in test comments for visual clarity

- **Reference expected values** from `mock-data.ts` instead of hardcoding

  ```typescript
  const expected = expectedSplitStatistics["Democrat × 18-34 OR 35-54"];
  expect(result).toBeCloseTo(expected.approval, 10);
  ```

- **Add comments to CSV** to explain what each row represents

- **Run the test report** to verify your calculations

### ❌ DON'T

- **Hardcode magic numbers** in tests without explanation

- **Skip inline calculations** in expected values

- **Forget to update multiple places** when adding data

- **Use imprecise equality checks** - use `toBeCloseTo` for floats

- **Confuse null responses with missing entries** - they are different:
  - Null response: Element exists with `response=null`
  - Missing entry: No element exists at all (use `MISSING` in CSV)

## Debugging Failed Tests

When a test fails:

1. **Run test report** to see expected values:

   ```bash
   npm run test:report > test-report.md
   ```

2. **Check the CSV data** - is the input correct?

3. **Verify expected calculations** - run the math by hand

4. **Compare actual vs expected**:

   - Look at the test failure message
   - Check if the calculation logic changed
   - Verify expected values are still correct

5. **Use console.log** to inspect intermediate values:
   ```typescript
   console.log(JSON.stringify(records, null, 2));
   ```

## Understanding the Calculations

### Unweighted Proportions

For each response group, count how many respondents have a value in that group:

```
proportion = count_in_group / total_respondents

Example: Democrat × 18-34 OR 35-54, Approval "Strongly Approve"
- Respondents in split: 1, 2
- Respondents with approval=0 (Strongly Approve): 1 (R1)
- Proportion: 1 / 2 = 0.5
```

### Weighted Proportions

For each response group, sum the weights of respondents in that group:

```
proportion = sum_of_weights_in_group / sum_of_total_weights

Example: Democrat × 18-34 OR 35-54, Approval "Strongly Approve"
- Respondents in split: 1 (weight=1.5), 2 (weight=0.8)
- Respondents with approval=0: 1 (weight=1.5)
- Sum of weights: 1.5 + 0.8 = 2.3
- Proportion: 1.5 / 2.3 ≈ 0.6522
```

### Filtering Logic

Respondents are excluded if they:

1. **Missing required question** - null/undefined response to any non-weight question
2. **Invalid response value** - response not in any valid response group
3. **Missing weight** (when weighted) - null/undefined weight when `weightQuestion` is defined

Valid respondents must have:

- Non-null response to ALL grouping questions (or element must exist)
- Non-null response to ALL response questions (or element must exist)
- Response values that belong to at least one response group
- Non-null weight (if using weighted analysis)

**Note:** A respondent is invalid if:

- Any required question has a null response element
- Any required question has no response element at all (MISSING)
- Any response value is outside valid ranges

## Test Data Integrity

To ensure test data remains valid:

1. **Verify CSV parsing** - check that `loadMockResponsesFromCsv()` works correctly

2. **Validate session config** - ensure all response values map to valid groups

3. **Check expected values** - run test report and verify calculations by hand

4. **Compare against actual code** - run tests to ensure expectations match reality

## Performance Considerations

The current test suite is small and runs quickly. If you add many more test cases:

- Consider splitting into multiple test files by function
- Use `test.each()` for parameterized tests
- Cache parsed CSV data (already implemented)
- Run specific tests during development: `npm test -- -t "specific test name"`

## Common Patterns

### Testing a specific split

```typescript
const split = splits.find(
  (s) =>
    s.groups[0].responseGroup?.label === "Democrat" &&
    s.groups[1].responseGroup?.label === "55+"
);
const result = populateSplitStatistics(split!, records, config);
```

### Checking proportions

```typescript
const question = result.responseQuestions.find((q) => q.varName === "approval");
expect(question!.responseGroups.expanded[0].proportion).toBeCloseTo(
  expected.approval.expanded["Strongly Approve"],
  10 // decimal places
);
```

### Verifying filtering

```typescript
const respondentIds = records.map((r) => r.respondentId);
expect(respondentIds).toEqual(expect.arrayContaining([1, 2, 3]));
expect(respondentIds).not.toContain(6); // Invalid respondent
```

## Questions?

If you're unsure about how to maintain or extend these tests:

1. Read through `tests/README.md` for the conceptual overview
2. Look at existing tests as examples
3. Run `npm run test:report` to see current expectations
4. Check inline comments in `mock-data.ts` for calculation explanations
