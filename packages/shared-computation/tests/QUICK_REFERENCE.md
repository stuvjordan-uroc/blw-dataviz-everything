# Quick Reference Card

## 🚀 Running Tests

```bash
npm test                              # Run all tests
npm test computations                 # Run computation tests only
npm run test:watch                    # Watch mode
npm run test:coverage                 # Coverage report
npm run test:report                   # Generate visual report
npm run test:report > report.md      # Save report to file
```

## 📁 Key Files

| File                                      | Purpose                            |
| ----------------------------------------- | ---------------------------------- |
| `tests/computations.test.ts`              | Test assertions with ASCII tables  |
| `tests/fixtures/mock-data.ts`             | Expected results (source of truth) |
| `tests/fixtures/mock-responses-wave1.csv` | Baseline test data (R1-10)         |
| `tests/fixtures/mock-responses-wave2.csv` | Incremental test data (R11-20)     |
| `tests/fixtures/generate-test-report.ts`  | Report generator                   |
| `tests/UPDATE_STATISTICS_TESTING.md`      | Incremental update testing guide   |

## 📊 Test Data Summary

**Wave 1 (Baseline):**

- Valid Respondents: 1, 2, 3, 4, 5 (5 total)
- Invalid Respondents: 6, 7, 8, 9, 10 (filtered out)

**Wave 2 (Incremental):**

- Valid Respondents: 11, 12, 13, 14, 15 (5 total)
- Invalid Respondents: 16, 17, 18, 19, 20 (filtered out)

**Invalid Types:**

- Null responses: 6, 7, 16, 17
- Invalid value: 8, 18
- Missing entries: 9, 10, 19, 20

**Expected Splits:** 9 (3 party options × 3 age options)

## 🔑 CSV Value Types

| Value Type        | Example         | Result                                 |
| ----------------- | --------------- | -------------------------------------- |
| Numeric           | `1.5`, `0`, `2` | Creates element with that value        |
| Empty or `"null"` | ``or`null`      | Creates element with `response=null`   |
| `"MISSING"`       | `MISSING`       | Skips creating element (missing entry) |

**Use cases:**

- Test null responses: Use empty string or `null`
- Test missing entries: Use `MISSING`

## 🔍 Finding Expected Values

All expected values are in `mock-data.ts`:

```typescript
import {
  expectedRespondentRecords,
  expectedSplitStatistics,
  expectedUpdateResults, // For incremental update tests
} from "./fixtures/mock-data";

// Which respondents should be included?
expectedRespondentRecords.withWeight.includedIds; // [1, 2, 3, 4, 5]

// What proportion for a specific split?
expectedSplitStatistics["Democrat × 18-34 OR 35-54"].unweighted.approval;

// What are the expected update results?
expectedUpdateResults.splits["Democrat × 55+"].wave2Incremental
  .incrementalWeight;
```

## � Key Formulas

### Proportion Calculation

```
proportion = weightedCount / totalWeight
```

**Example:**

```
Respondent 1: weight=1.5, response="Strongly Approve"
Respondent 2: weight=0.8, response="Somewhat Approve"
Total Weight: 2.3

Strongly Approve proportion = 1.5 / 2.3 = 0.6522
Somewhat Approve proportion = 0.8 / 2.3 = 0.3478
```

### Incremental Update Algorithm

```
1. Convert proportions to counts:
   oldCount = oldProportion × oldTotalWeight

2. Add new counts:
   newCount = oldCount + incrementalCount

3. Update total weight:
   newTotalWeight = oldTotalWeight + incrementalWeight

4. Recompute proportions:
   newProportion = newCount / newTotalWeight
```

**Example:**

```
Wave 1: totalWeight=2.3, "Strongly Approve"=65.22%
Wave 2: New respondent with weight=1.1, response="Strongly Approve"

Step 1: 0.6522 × 2.3 = 1.5
Step 2: 1.5 + 1.1 = 2.6
Step 3: 2.3 + 1.1 = 3.4
Step 4: 2.6 / 3.4 = 0.7647 (76.47%)
```

## 🔍 Finding Expected Values

### 1. Update CSV

```csv
# Valid respondent with numeric values
11,1.3,1,1,2,0    # Republican, 35-54, Somewhat Disapprove, none

# Invalid respondent with null response
12,,,1,1,0        # Null weight and party (elements exist with null)

# Invalid respondent with missing entry
13,1.2,MISSING,1,1,0    # MISSING party (no element created)
```

### 2. Update Expected Results

```typescript
// In mock-data.ts
withWeight: {
  includedIds: [1, 2, 3, 4, 5, 9],  // Add 9
  totalCount: 6,                     // Update count
}
```

### 3. Recalculate Split Stats

```typescript
"Republican × 18-34 OR 35-54": {
  respondentIds: [3, 9],  // Updated
  unweighted: {
    n: 2,  // Updated
    // ... recalculate proportions
  }
}
```

### 4. For Incremental Updates (Wave 2)

```typescript
// In expectedUpdateResults
"Democrat × 55+": {
  wave1: {
    respondentIds: [5],
    totalWeight: 1.0,
    proportions: { "Strongly Approve": 1.0 }
  },
  wave2Incremental: {
    respondentIds: [15],
    incrementalWeight: 0.7,
    newCounts: { "Somewhat Approve": 0.7 }
  },
  updated: {
    respondentIds: [5, 15],
    totalWeight: 1.7,  // 1.0 + 0.7
    proportions: {
      "Strongly Approve": 1.0 / 1.7,  // = 0.5882
      "Somewhat Approve": 0.7 / 1.7   // = 0.4118
    }
  }
}
```

## 📝 Adding Test Data

```bash
npm test
```

## 🧮 Calculation Formulas

### Unweighted

```
proportion = count_in_group / total_respondents

Example:
- 1 respondent with "Strongly Approve"
- 2 total respondents
- Proportion = 1 / 2 = 0.5
```

### Weighted

```
proportion = sum_of_weights_in_group / sum_of_total_weights

Example:
- 1 respondent (weight 1.5) with "Strongly Approve"
- Total weights = 1.5 + 0.8 = 2.3
- Proportion = 1.5 / 2.3 ≈ 0.6522
```

## 🐛 Debugging Failed Tests

1. **Generate test report**

   ```bash
   npm run test:report > debug.md
   ```

2. **Check expected values** in `mock-data.ts`

3. **Verify CSV data** is correct

4. **Add console.log** in test:

   ```typescript
   console.log(JSON.stringify(result, null, 2));
   ```

5. **Run specific test**:
   ```bash
   npm test -- -t "should compute correct proportions"
   ```

## 📖 Documentation

- **README.md** - Test overview and architecture
- **MAINTENANCE.md** - How to maintain and extend tests
- **VISUAL_GUIDE.md** - Visual diagrams and examples
- **IMPLEMENTATION_SUMMARY.md** - What was implemented

## ✅ Test Coverage

### buildRespondentRecords (8 tests)

- [x] Filter null responses to non-weight questions
- [x] Filter missing entries for non-weight questions
- [x] Filter invalid response values
- [x] Filter null weight (when required)
- [x] Handle both null responses and missing entries
- [x] Verify excluded respondents match expected
- [x] Include valid respondents (without weight)
- [x] Include valid respondents (with weight)

### generateSplits (1 test)

- [x] Produce correct array of splits

### populateSplitStatistics (2 tests)

- [x] Compute unweighted proportions
- [x] Compute weighted proportions

### updateSplitStatistics (20 tests)

**Invalid respondent filtering (4 tests):**

- [x] Filter Wave 2 respondents with null responses
- [x] Filter Wave 2 respondents with missing entries
- [x] Filter Wave 2 respondents with invalid values
- [x] Handle mixed invalid types in Wave 2 data

**Edge cases (4 tests):**

- [x] Return unchanged statistics when newResponses is empty
- [x] Return unchanged when all new respondents are invalid
- [x] Handle splits with no matching new respondents
- [x] Handle zero weight gracefully

**Incremental update correctness (5 tests):**

- [x] Match full recomputation for weighted statistics
- [x] Match full recomputation for unweighted statistics
- [x] Correctly update splits with single Wave 1 respondent
- [x] Correctly update splits with multiple Wave 1 respondents
- [x] Correctly update the 'all groups' split

**Proportion math verification (4 tests):**

- [x] Correctly convert proportions back to counts
- [x] Correctly add incremental counts
- [x] Correctly recompute proportions with new total
- [x] Maintain sum of proportions ≈ 1.0

**Total weight tracking (3 tests):**

- [x] Correctly sum weights from new valid respondents
- [x] Correctly compute updated total weight
- [x] Not include weights from filtered respondents

**Total: 31/31 tests passing ✅**

## 💡 Best Practices

✅ **DO:**

- Reference `expectedSplitStatistics` in tests
- Add inline math comments in `mock-data.ts`
- Use ASCII tables in test comments
- Run `test:report` to verify calculations

❌ **DON'T:**

- Hardcode magic numbers in tests
- Skip inline calculations
- Forget to update multiple places
- Use exact equality for floats (use `toBeCloseTo`)

## 🎯 Common Test Patterns

### Find a specific split

```typescript
const split = splits.find(
  (s) =>
    s.groups[0].responseGroup?.label === "Democrat" &&
    s.groups[1].responseGroup?.label === "55+"
);
```

### Check proportions

```typescript
const expected = expectedSplitStatistics["Democrat × 55+"];
expect(result.proportion).toBeCloseTo(expected.approval, 10);
```

### Verify filtering

```typescript
const ids = records.map((r) => r.respondentId);
expect(ids).toEqual(expect.arrayContaining([1, 2, 3]));
expect(ids).not.toContain(6); // Invalid
```

### Test incremental updates

```typescript
// Get Wave 1 statistics
const wave1Stats = computeSplitStatistics(
  wave1Responses,
  mockSessionConfig,
  mockWeightQuestion
);

// Apply incremental update with Wave 2 data
const updated = updateSplitStatistics(
  wave1Stats,
  wave2Responses,
  mockSessionConfig,
  mockWeightQuestion
);

// Verify against full recomputation
const fullRecompute = computeSplitStatistics(
  [...wave1Responses, ...wave2Responses],
  mockSessionConfig,
  mockWeightQuestion
);

// Compare proportions (within tolerance)
const updatedProportion =
  updated.statistics[0].responseQuestions[0].responseGroups.expanded[0]
    .proportion;
const fullProportion =
  fullRecompute.statistics[0].responseQuestions[0].responseGroups.expanded[0]
    .proportion;
expect(updatedProportion).toBeCloseTo(fullProportion, 4);
```

## 📈 Test Report Preview

The test report shows:

- All respondent data with human-readable labels
- Invalid respondents and exclusion reasons
- All 9 splits and their matching respondents
- Sample calculations for key splits
- Session configuration details

```bash
npm run test:report
```

## 🔗 Related Commands

```bash
# Build package
npm run build

# Lint
npm run lint

# Clean
npm run clean
```

---

**Need Help?** Check the documentation files in `tests/` directory!
