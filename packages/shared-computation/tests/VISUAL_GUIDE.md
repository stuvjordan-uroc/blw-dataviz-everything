# Test Architecture Visual Guide

## Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          TEST DATA SOURCES                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  mock-responses.csv                                                         │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │ respondent_id,weight,party,age_group,approval,anger        │            │
│  │ 1,1.5,0,0,0,1         # Numeric values → element created   │            │
│  │ 6,,,0,1,1             # Empty → null response element      │            │
│  │ 9,1.4,MISSING,1,1,0   # MISSING → no element created       │            │
│  │ ...                                                         │            │
│  └────────────────────────────────────────────────────────────┘            │
│                            ↓ parsed by                                      │
│                   loadMockResponsesFromCsv()                                │
│                   (handles MISSING sentinel)                                │
│                            ↓                                                │
│  ResponseData[]                                                             │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │ [{ respondentId: 1, varName: "party", response: 0, ... },  │            │
│  │  { respondentId: 6, varName: "party", response: null },    │            │
│  │  // Note: No party element for respondent 9 (MISSING)      │            │
│  │ ]                                                           │            │
│  └────────────────────────────────────────────────────────────┘            │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                        EXPECTED RESULTS (mock-data.ts)                      │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  expectedRespondentRecords                                                  │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │ withoutWeight: {                                            │            │
│  │   includedIds: [1, 2, 3, 4, 5],                            │            │
│  │   excludedIds: [6, 7, 8, 9, 10],                           │            │
│  │   explanation: {                                            │            │
│  │     excluded: {                                             │            │
│  │       6: "null response element",                           │            │
│  │       7: "null response element",                           │            │
│  │       8: "invalid value",                                   │            │
│  │       9: "no response element (MISSING)",                   │            │
│  │       10: "no response element (MISSING)"                   │            │
│  │     }                                                        │            │
│  │   }                                                          │            │
│  │ }                                                           │            │
│  └────────────────────────────────────────────────────────────┘            │
│                                                                             │
│  expectedSplitStatistics                                                    │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │ "Democrat × 18-34 OR 35-54": {                             │            │
│  │   unweighted: {                                             │            │
│  │     approval: {                                             │            │
│  │       "Strongly Approve": 1/2,  // R1                      │            │
│  │       "Somewhat Approve": 1/2,  // R2                      │            │
│  │     }                                                       │            │
│  │   },                                                        │            │
│  │   weighted: {                                               │            │
│  │     effectiveN: 2.3,  // 1.5 + 0.8                         │            │
│  │     approval: {                                             │            │
│  │       "Strongly Approve": 1.5/2.3,  // R1 weight           │            │
│  │       "Somewhat Approve": 0.8/2.3,  // R2 weight           │            │
│  │     }                                                       │            │
│  │   }                                                         │            │
│  │ }                                                           │            │
│  └────────────────────────────────────────────────────────────┘            │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                        TEST ASSERTIONS (computations.test.ts)               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  test("should compute correct proportions", () => {                        │
│    /**                                                                      │
│     * Split: Democrat × 18-34 OR 35-54                                     │
│     * Matching respondents: 1, 2                                           │
│     *                                                                       │
│     * UNWEIGHTED Expected:                                                 │
│     * - Strongly Approve: 1/2 = 0.5                                        │
│     * - Somewhat Approve: 1/2 = 0.5                                        │
│     */                                                                      │
│                                                                             │
│    const expected = expectedSplitStatistics["Democrat × 18-34 OR 35-54"];  │
│    const result = populateSplitStatistics(...);                            │
│                                                                             │
│    expect(result.approval).toBeCloseTo(expected.approval, 10);             │
│  });                                                                        │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

## Test Data Overview

### Valid Respondents

```
┌────┬────────┬────────────┬────────┬─────────────────────┬───────────┐
│ ID │ Weight │ Party      │ Age    │ Approval            │ Anger     │
├────┼────────┼────────────┼────────┼─────────────────────┼───────────┤
│ 1  │ 1.5    │ Democrat   │ 18-34  │ Strongly Approve    │ irritated │
│ 2  │ 0.8    │ Democrat   │ 35-54  │ Somewhat Approve    │ none      │
│ 3  │ 2.0    │ Republican │ 18-34  │ Strongly Disapprove │ aflame    │
│ 4  │ 1.2    │ Republican │ 55+    │ Somewhat Disapprove │ hot       │
│ 5  │ 1.0    │ Democrat   │ 55+    │ Strongly Approve    │ hot       │
└────┴────────┴────────────┴────────┴─────────────────────┴───────────┘
```

### Invalid Respondents (Filtered Out)

```
┌────┬──────────────┬──────────────────────────────────────────────────────┐
│ ID │ Type         │ Reason                                               │
├────┼──────────────┼──────────────────────────────────────────────────────┤
│ 6  │ Null resp    │ Missing party (null element) - grouping question     │
│ 7  │ Null resp    │ Missing age_group (null element) - grouping question │
│ 8  │ Invalid val  │ Invalid approval (5) - not in any response group     │
│ 9  │ Missing ent  │ Missing party (no element) - grouping question       │
│ 10 │ Missing ent  │ Missing approval (no element) - response question    │
└────┴──────────────┴──────────────────────────────────────────────────────┘

Legend:
  Null resp    = ResponseData element exists with response=null
  Invalid val  = ResponseData element has invalid numeric value
  Missing ent  = No ResponseData element created (MISSING in CSV)
```

## Split Generation

### Grouping Questions

```
Party:     [Democrat, Republican, null]  → 3 options
Age Group: [18-34 OR 35-54, 55+, null]  → 3 options

Cartesian Product: 3 × 3 = 9 splits
```

### Generated Splits

```
1. Democrat   × 18-34 OR 35-54  → Respondents: 1, 2
2. Democrat   × 55+              → Respondents: 5
3. Democrat   × (all ages)       → Respondents: 1, 2, 5
4. Republican × 18-34 OR 35-54  → Respondents: 3
5. Republican × 55+              → Respondents: 4
6. Republican × (all ages)       → Respondents: 3, 4
7. (all)      × 18-34 OR 35-54  → Respondents: 1, 2, 3
8. (all)      × 55+              → Respondents: 4, 5
9. (all)      × (all ages)       → Respondents: 1, 2, 3, 4, 5
```

## Sample Calculation: Split 1 (Democrat × 18-34 OR 35-54)

### Matching Respondents

```
┌────┬────────┬───────────┬─────────┬──────────────────┐
│ ID │ Weight │ Party     │ Age     │ Approval         │
├────┼────────┼───────────┼─────────┼──────────────────┤
│ 1  │ 1.5    │ Democrat  │ 18-34   │ Strongly Approve │
│ 2  │ 0.8    │ Democrat  │ 35-54   │ Somewhat Approve │
└────┴────────┴───────────┴─────────┴──────────────────┘
```

### Unweighted Calculation

```
n = 2

Approval Distribution:
  Strongly Approve (R1):    1 / 2 = 0.5000
  Somewhat Approve (R2):    1 / 2 = 0.5000
  Somewhat Disapprove:      0 / 2 = 0.0000
  Strongly Disapprove:      0 / 2 = 0.0000

Collapsed:
  Approve (R1 + R2):        2 / 2 = 1.0000
  Disapprove:               0 / 2 = 0.0000
```

### Weighted Calculation

```
effectiveN = 1.5 + 0.8 = 2.3

Approval Distribution:
  Strongly Approve (R1):    1.5 / 2.3 = 0.6522
  Somewhat Approve (R2):    0.8 / 2.3 = 0.3478
  Somewhat Disapprove:      0.0 / 2.3 = 0.0000
  Strongly Disapprove:      0.0 / 2.3 = 0.0000

Collapsed:
  Approve (R1 + R2):        2.3 / 2.3 = 1.0000
  Disapprove:               0.0 / 2.3 = 0.0000
```

## Utilities

### Test Report Generator

```bash
npm run test:report
```

Generates markdown showing:

- All respondent data with labels
- Invalid respondents and reasons
- All splits and their matching respondents
- Sample calculations for key splits
- Session configuration details

### Test Commands

```bash
npm test                    # Run all tests
npm test computations      # Run only computation tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

## File Structure

```
tests/
├── computations.test.ts           # Main test file with assertions
├── update-statistics.test.ts      # Update statistics tests
├── README.md                      # Test overview and concepts
├── MAINTENANCE.md                 # Guide for maintaining tests
├── IMPLEMENTATION_SUMMARY.md      # What was implemented
└── fixtures/
    ├── mock-responses.csv         # Human-readable test data
    ├── mock-data.ts               # Expected results (source of truth)
    └── generate-test-report.ts    # Report generator utility
```

## Benefits at a Glance

| Aspect              | Solution                    | Benefit                                 |
| ------------------- | --------------------------- | --------------------------------------- |
| **Data Format**     | CSV with inline comments    | Easy to read, can use spreadsheet tools |
| **Expected Values** | TypeScript with inline math | Type-safe, verifiable calculations      |
| **Test Docs**       | ASCII tables + comments     | Visual clarity, self-documenting        |
| **Single Source**   | mock-data.ts exports        | Define once, reference everywhere       |
| **Debugging**       | Test report generator       | See all data and expectations clearly   |
| **Maintenance**     | Clear patterns              | Easy to add/modify test cases           |

## Adding New Test Data

1. **Add to CSV**

   ```csv
   9,1.3,1,1,2,0    # Republican, 35-54, Somewhat Disapprove, none
   ```

2. **Update Expected Results**

   ```typescript
   includedIds: [1, 2, 3, 4, 5, 9],  // Add ID 9
   ```

3. **Recalculate Split Statistics**

   ```typescript
   "Republican × 18-34 OR 35-54": {
     respondentIds: [3, 9],  // Now includes R9
     unweighted: {
       n: 2,  // Was 1, now 2
       approval: {
         "Strongly Disapprove": 1/2,  // R3
         "Somewhat Disapprove": 1/2,  // R9
       }
     }
   }
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

Done! ✅
