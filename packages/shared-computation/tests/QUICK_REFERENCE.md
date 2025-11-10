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

| File                                     | Purpose                            |
| ---------------------------------------- | ---------------------------------- |
| `tests/computations.test.ts`             | Test assertions with ASCII tables  |
| `tests/fixtures/mock-data.ts`            | Expected results (source of truth) |
| `tests/fixtures/mock-responses.csv`      | Human-readable test data           |
| `tests/fixtures/generate-test-report.ts` | Report generator                   |

## 📊 Test Data Summary

**Valid Respondents:** 1, 2, 3, 4, 5 (5 total)  
**Invalid Respondents:** 6, 7, 8, 9, 10 (filtered out)

- Null responses: 6, 7
- Invalid value: 8
- Missing entries: 9, 10

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
} from "./fixtures/mock-data";

// Which respondents should be included?
expectedRespondentRecords.withWeight.includedIds; // [1, 2, 3, 4, 5]

// What proportion for a specific split?
expectedSplitStatistics["Democrat × 18-34 OR 35-54"].unweighted.approval;
```

## 📝 Adding Test Data

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

### 4. Run Tests

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

### buildRespondentRecords (6 tests)

- [x] Filter missing non-weight questions
- [x] Filter invalid response values
- [x] Filter missing weight (when required)
- [x] Filter null weight (when required)
- [x] Include valid respondents (without weight)
- [x] Include valid respondents (with weight)

### generateSplits (1 test)

- [x] Produce correct array of splits

### populateSplitStatistics (2 tests)

- [x] Compute unweighted proportions
- [x] Compute weighted proportions

**Total: 9/9 tests passing ✅**

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
