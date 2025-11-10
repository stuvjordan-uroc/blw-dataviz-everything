# Incremental Statistics Update Testing

## Overview

This document explains the testing strategy for `updateSplitStatistics()`, which enables efficient incremental updates to poll statistics when new respondent data arrives.

### The Problem

When new poll responses arrive (e.g., a second "wave" of data collection), we need to update existing statistics without reprocessing all respondents from scratch. For large datasets, full recomputation would be inefficient.

### The Solution

The `updateSplitStatistics()` function performs incremental updates by:

1. **Using stored total weights**: Each split stores its `totalWeight` (sum of respondent weights)
2. **Converting proportions to counts**: `count = proportion × totalWeight`
3. **Adding new counts**: Process only new respondents, add their weighted counts
4. **Updating total weight**: `newTotalWeight = oldTotalWeight + incrementalWeight`
5. **Recomputing proportions**: `newProportion = newCount / newTotalWeight`

This approach is mathematically equivalent to full recomputation but processes only new data.

## Two-Wave Test Architecture

### Wave 1 (Baseline Data)

**File**: `tests/fixtures/mock-responses-wave1.csv`

Contains 10 respondents (IDs 1-10):

- **5 valid respondents** (IDs: 1, 2, 3, 4, 5)
- **5 invalid respondents** (IDs: 6, 7, 8, 9, 10)

Valid respondents represent the initial/baseline state with varied demographics and responses.

### Wave 2 (Incremental Data)

**File**: `tests/fixtures/mock-responses-wave2.csv`

Contains 10 new respondents (IDs 11-20):

- **5 valid respondents** (IDs: 11, 12, 13, 14, 15)
- **5 invalid respondents** (IDs: 16, 17, 18, 19, 20)

Invalid respondents in Wave 2 mirror the same error types as Wave 1 to ensure consistent filtering behavior.

### Invalid Respondent Types

Both waves include the same types of invalid data:

| ID (Wave 1/2) | Error Type                | Description                               |
| ------------- | ------------------------- | ----------------------------------------- |
| 6, 16         | Null grouping question    | Missing party (null response element)     |
| 7, 17         | Null grouping question    | Missing age_group (null response element) |
| 8, 18         | Invalid response value    | Approval value outside defined groups     |
| 9, 19         | Missing grouping question | No party response element exists          |
| 10, 20        | Missing response question | No approval response element exists       |

## Mathematical Verification Strategy

### Core Principle

**Incremental updates must produce identical results to full recomputation.**

For any split, given:

- Original statistics from Wave 1 respondents
- New Wave 2 respondents

We verify: `updateSplitStatistics(original, wave2) === computeSplitStatistics(wave1 + wave2)`

### Verification Approach

1. **Compute Wave 1 baseline**: Use `computeSplitStatistics()` on Wave 1 data
2. **Apply incremental update**: Use `updateSplitStatistics()` with Wave 2 data
3. **Compute full recomputation**: Use `computeSplitStatistics()` on combined Wave 1 + Wave 2 data
4. **Compare results**: Verify proportions match within floating-point tolerance (0.0001)

### Example Calculation

**Democrat × 18-34 OR 35-54** split:

```
Wave 1 State:
  Respondents: 1, 2
  Weights: 1.5, 0.8
  Total Weight: 2.3
  Strongly Approve: 1.5 / 2.3 = 0.6522 (65.22%)
  Somewhat Approve: 0.8 / 2.3 = 0.3478 (34.78%)

Wave 2 Incremental:
  New Respondents: 11, 13
  Weights: 1.3, 1.1
  Incremental Weight: 2.4
  Strongly Approve: 1.1
  Somewhat Approve: 1.3

Incremental Update Process:
  1. Convert to counts:
     - Strongly Approve: 0.6522 × 2.3 = 1.5
     - Somewhat Approve: 0.3478 × 2.3 = 0.8

  2. Add new counts:
     - Strongly Approve: 1.5 + 1.1 = 2.6
     - Somewhat Approve: 0.8 + 1.3 = 2.1

  3. Update total weight:
     - New Total: 2.3 + 2.4 = 4.7

  4. Recompute proportions:
     - Strongly Approve: 2.6 / 4.7 = 0.5532 (55.32%)
     - Somewhat Approve: 2.1 / 4.7 = 0.4468 (44.68%)

Full Recomputation (Verification):
  All Respondents: 1, 2, 11, 13
  Weights: 1.5, 0.8, 1.3, 1.1
  Total Weight: 4.7
  Strongly Approve: (1.5 + 1.1) / 4.7 = 0.5532 ✅
  Somewhat Approve: (0.8 + 1.3) / 4.7 = 0.4468 ✅
```

## Test Scenarios

### 1. Invalid Respondent Filtering (4 tests)

**Purpose**: Verify that invalid Wave 2 respondents are correctly excluded from updates.

- **Null responses**: Respondents with null values for required questions (R16, R17)
- **Missing entries**: Respondents with no response element for required questions (R19, R20)
- **Invalid values**: Respondents with response values outside defined groups (R18)
- **Mixed invalid types**: Combinations of multiple validity issues

**Rationale**: Invalid data must be filtered consistently in both initial computation and incremental updates.

### 2. Edge Cases (4 tests)

**Purpose**: Ensure robust handling of boundary conditions.

- **Empty new responses**: Update with empty array should return unchanged statistics
- **All invalid new respondents**: Update with only invalid respondents should return unchanged statistics
- **No matching respondents**: Splits with no new respondents matching their grouping criteria
- **Zero weight handling**: Gracefully handle splits with zero weight (no valid respondents)

**Rationale**: Edge cases often expose bugs in incremental logic. These tests ensure the function degrades gracefully.

### 3. Incremental Update Correctness (5 tests)

**Purpose**: Verify mathematical equivalence between incremental updates and full recomputation.

- **Weighted statistics match**: Incremental update with weights equals full recomputation
- **Unweighted statistics match**: Incremental update without weights equals full recomputation
- **Single-respondent splits**: Updates to splits starting with only 1 Wave 1 respondent
- **Multi-respondent splits**: Updates to splits with multiple Wave 1 respondents
- **All-groups split**: Update to the broadest split (all parties × all ages)

**Rationale**: These tests verify the core correctness guarantee: incremental === full recomputation.

### 4. Proportion Math Verification (4 tests)

**Purpose**: Validate the mathematical operations in the update algorithm.

- **Proportion-to-count conversion**: `count = proportion × totalWeight` preserves original values
- **Count addition**: Adding incremental counts produces correct sums
- **Proportion recomputation**: `newProportion = newCount / newTotalWeight` is correct
- **Sum of proportions**: Mutually exclusive groups sum to ≈1.0 (within floating-point tolerance)

**Rationale**: These tests isolate individual mathematical steps to catch calculation errors.

### 5. Total Weight Tracking (3 tests)

**Purpose**: Verify correct tracking of respondent weights throughout the update process.

- **Weight summing**: New valid respondents' weights are correctly summed
- **Total weight update**: Updated totalWeight equals original + incremental
- **Filtered weights excluded**: Invalid respondents' weights are not included

**Rationale**: The `totalWeight` field is critical to the incremental update algorithm. These tests ensure it's maintained correctly.

## Test Data Reference

For detailed test data including:

- All respondent data (Wave 1 and Wave 2)
- Invalid respondent explanations
- Sample split calculations (weighted and unweighted)
- Incremental update scenarios with step-by-step math

See: [`TEST_DATA_REPORT.md`](../TEST_DATA_REPORT.md)

## Key Implementation Requirements

### Split Interface

Each `Split` object must include:

```typescript
interface Split {
  totalWeight: number; // Sum of weights for all respondents matching this split
  // ... other fields
}
```

### Weight Storage

- `computeSplitStatistics()` must populate `totalWeight` for each split
- `totalWeight` must be stored in the database alongside proportions
- `updateSplitStatistics()` must update `totalWeight` with new respondent weights

### Floating-Point Tolerance

Due to floating-point arithmetic, exact equality is not guaranteed. Tests use a tolerance of `0.0001` (0.01%) when comparing proportions.

## Common Pitfalls

### ❌ Don't: Try to reverse-engineer weights from proportions alone

Without stored `totalWeight`, you cannot convert proportions back to counts:

```typescript
// IMPOSSIBLE without totalWeight:
const count = proportion; // ??? multiply by what?
```

### ✅ Do: Store totalWeight alongside proportions

With `totalWeight`, conversion is straightforward:

```typescript
const count = proportion * split.totalWeight;
```

### ❌ Don't: Assume all new respondents are valid

Always filter new respondents through `buildRespondentRecords()`:

```typescript
// WRONG:
const newCounts = computeCountsForSplit(allNewResponses);

// CORRECT:
const validNewRespondents = buildRespondentRecords(...);
const newCounts = computeCountsForSplit(validNewRespondents);
```

### ✅ Do: Verify incremental matches full recomputation

Every incremental update test should include a verification step:

```typescript
const incremental = updateSplitStatistics(wave1Stats, wave2Responses);
const fullRecompute = computeSplitStatistics(combinedResponses);
expect(incremental).toMatchProportions(fullRecompute);
```

## Running the Tests

```bash
# Run all tests
npm test

# Run only updateSplitStatistics tests
npm test -- --testNamePattern="updateSplitStatistics"

# Run with coverage
npm test -- --coverage
```

## Maintenance

### Adding New Test Scenarios

When adding new test scenarios:

1. **Add Wave 2 data** to `mock-responses-wave2.csv` if needed
2. **Calculate expected results** manually and add to `expectedUpdateResults` in `mock-data.ts`
3. **Document the calculation** with inline comments showing the math
4. **Write the test** with descriptive assertions
5. **Verify full recomputation** matches the incremental result

### Updating Test Data

When modifying test data:

1. **Update both waves** to maintain consistency
2. **Recalculate expected results** in `expectedUpdateResults`
3. **Regenerate the report**: Run `npx ts-node tests/fixtures/generate-test-report.ts > TEST_DATA_REPORT.md`
4. **Run all tests** to ensure nothing broke

## Related Documentation

- **[README.md](./README.md)**: Package overview and quick start
- **[MAINTENANCE.md](./MAINTENANCE.md)**: Detailed maintenance procedures
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)**: Formula reference and lookup tables
- **[TEST_DATA_REPORT.md](../TEST_DATA_REPORT.md)**: Complete test data reference with calculations
