# Computation Test Data & Expected Results

Generated: 2025-11-10T18:02:04.445Z

## Mock Respondent Data (Wave 1)

From `mock-responses-wave1.csv`:

| ID | Weight | Party      | Age    | Approval            | Anger     | Status  |
|----|--------|------------|--------|---------------------|-----------|----------|
| 1  | 1.5    | Democrat   | 18-34  | Strongly Approve    | irritated | ✅ valid |
| 2  | 0.8    | Democrat   | 35-54  | Somewhat Approve    | none      | ✅ valid |
| 3  | 2      | Republican | 18-34  | Strongly Disapprove | aflame    | ✅ valid |
| 4  | 1.2    | Republican | 55+    | Somewhat Disapprove | hot       | ✅ valid |
| 5  | 1      | Democrat   | 55+    | Strongly Approve    | hot       | ✅ valid |
| 6  | null   | null       | 18-34  | Somewhat Approve    | irritated | ❌ invalid |
| 7  | 1.1    | Democrat   | null   | Somewhat Approve    | none      | ❌ invalid |
| 8  | 0.9    | Republican | 35-54  | 5 (invalid)         | irritated | ❌ invalid |
| 9  | 1.4    | null       | 35-54  | Somewhat Approve    | none      | ❌ invalid |
| 10  | 1.5    | Democrat   | 18-34  | null                | irritated | ❌ invalid |

## Invalid Respondents (Filtered Out)

| ID | Reason |
|----|--------|
| 6  | Missing party (null response element exists) - required grouping question |
| 7  | Missing age_group (null response element exists) - required grouping question |
| 8  | Invalid approval value (5) - not in any response group |
| 9  | Missing party (no response element) - required grouping question |
| 10  | Missing approval (no response element) - required response question |

## Wave 2 Respondent Data (Incremental)

From `mock-responses-wave2.csv`:

| ID | Weight | Party      | Age    | Approval            | Anger     | Status  |
|----|--------|------------|--------|---------------------|-----------|----------|
| 11  | 1.3    | Democrat   | 18-34  | Somewhat Approve    | none      | ✅ valid |
| 12  | 0.9    | Republican | 55+    | Somewhat Disapprove | irritated | ✅ valid |
| 13  | 1.1    | Democrat   | 35-54  | Strongly Approve    | hot       | ✅ valid |
| 14  | 1.5    | Republican | 18-34  | Strongly Disapprove | aflame    | ✅ valid |
| 15  | 0.7    | Democrat   | 55+    | Somewhat Approve    | irritated | ✅ valid |
| 16  | null   | null       | 35-54  | Somewhat Approve    | none      | ❌ invalid |
| 17  | 1.2    | Republican | null   | Somewhat Disapprove | none      | ❌ invalid |
| 18  | 0.95   | Democrat   | 18-34  | 5 (invalid)         | irritated | ❌ invalid |
| 19  | 1.6    | null       | 35-54  | Somewhat Approve    | none      | ❌ invalid |
| 20  | 1.4    | Republican | 35-54  | null                | hot       | ❌ invalid |

**Wave 2 Summary:**
- Valid respondents: 5
- Invalid respondents: 5
- Total weight (valid): 5.500000000000001

## Wave 2 Invalid Respondents (Filtered Out)

| ID | Reason |
|----|--------|
| 16  | Missing both weight (null element) and party (null element) - multiple failures |
| 17  | Missing age_group (null response element exists) - required grouping question |
| 18  | Invalid approval value (5) - not in any response group |
| 19  | Missing party (no response element) - required grouping question |
| 20  | Missing approval (no response element) - required response question |

## Expected Splits

Total combinations: 9

Session config has:
- Party: 2 groups (Democrat, Republican) + null = 3 options
- Age: 2 groups (18-34 OR 35-54, 55+) + null = 3 options
- Cartesian product: 3 × 3 = 9 splits

Split labels:
1. Democrat × 18-34 OR 35-54
2. Democrat × 55+
3. Democrat × (all ages)
4. Republican × 18-34 OR 35-54
5. Republican × 55+
6. Republican × (all ages)
7. (all parties) × 18-34 OR 35-54
8. (all parties) × 55+
9. (all parties) × (all ages)

## Sample Split Calculations

### Democrat × 18-34 OR 35-54

**Matching respondents:** 1, 2

#### Unweighted Calculation

- **n =** 2
- **Approval (expanded):**
  - Strongly Approve: 0.5000
  - Somewhat Approve: 0.5000
  - Somewhat Disapprove: 0.0000
  - Strongly Disapprove: 0.0000
- **Approval (collapsed):**
  - Approve: 1.0000
  - Disapprove: 0.0000

#### Weighted Calculation

- **effectiveN =** 2.3
- **Approval (expanded):**
  - Strongly Approve: 0.6522
  - Somewhat Approve: 0.3478
  - Somewhat Disapprove: 0.0000
  - Strongly Disapprove: 0.0000
- **Approval (collapsed):**
  - Approve: 1.0000
  - Disapprove: 0.0000

### Republican × 55+

**Matching respondents:** 4

#### Unweighted Calculation

- **n =** 1
- **Approval (expanded):**
  - Strongly Approve: 0.0000
  - Somewhat Approve: 0.0000
  - Somewhat Disapprove: 1.0000
  - Strongly Disapprove: 0.0000
- **Approval (collapsed):**
  - Approve: 0.0000
  - Disapprove: 1.0000

#### Weighted Calculation

- **effectiveN =** 1.2
- **Approval (expanded):**
  - Strongly Approve: 0.0000
  - Somewhat Approve: 0.0000
  - Somewhat Disapprove: 1.0000
  - Strongly Disapprove: 0.0000
- **Approval (collapsed):**
  - Approve: 0.0000
  - Disapprove: 1.0000

### (all parties) × (all ages)

**Matching respondents:** 1, 2, 3, 4, 5

#### Unweighted Calculation

- **n =** 5
- **Approval (expanded):**
  - Strongly Approve: 0.4000
  - Somewhat Approve: 0.2000
  - Somewhat Disapprove: 0.2000
  - Strongly Disapprove: 0.2000
- **Approval (collapsed):**
  - Approve: 0.6000
  - Disapprove: 0.4000

#### Weighted Calculation

- **effectiveN =** 6.5
- **Approval (expanded):**
  - Strongly Approve: 0.3846
  - Somewhat Approve: 0.1231
  - Somewhat Disapprove: 0.1846
  - Strongly Disapprove: 0.3077
- **Approval (collapsed):**
  - Approve: 0.5077
  - Disapprove: 0.4923

## Incremental Update Scenarios

Demonstrating `updateSplitStatistics()` with Wave 1 → Wave 2 updates.

### Democrat × 18-34 OR 35-54

#### Wave 1 State (Baseline)

- **Respondents:** 1, 2
- **Total Weight:** 2.30
- **Approval (expanded):**
  - Strongly Approve: 65.22%
  - Somewhat Approve: 34.78%
  - Somewhat Disapprove: 0.00%
  - Strongly Disapprove: 0.00%

#### Wave 2 Incremental Data

- **New Respondents:** 11, 13
- **Incremental Weight:** 2.40
- **New Approval Weighted Counts (expanded):**
  - Strongly Approve: 1.10
  - Somewhat Approve: 1.30
  - Somewhat Disapprove: 0.00
  - Strongly Disapprove: 0.00

#### Updated State (After Incremental Update)

- **Total Respondents:** 1, 2, 11, 13
- **Total Weight:** 4.70 (was 2.30, added 2.40)
- **Approval (expanded):**
  - Strongly Approve: 55.32%
  - Somewhat Approve: 44.68%
  - Somewhat Disapprove: 0.00%
  - Strongly Disapprove: 0.00%

#### Verification (Full Recomputation)

✅ Incremental update matches full recomputation (difference < 0.01%)

### Democrat × 55+

#### Wave 1 State (Baseline)

- **Respondents:** 5
- **Total Weight:** 1.00
- **Approval (expanded):**
  - Strongly Approve: 100.00%
  - Somewhat Approve: 0.00%
  - Somewhat Disapprove: 0.00%
  - Strongly Disapprove: 0.00%

#### Wave 2 Incremental Data

- **New Respondents:** 15
- **Incremental Weight:** 0.70
- **New Approval Weighted Counts (expanded):**
  - Strongly Approve: 0.00
  - Somewhat Approve: 0.70
  - Somewhat Disapprove: 0.00
  - Strongly Disapprove: 0.00

#### Updated State (After Incremental Update)

- **Total Respondents:** 5, 15
- **Total Weight:** 1.70 (was 1.00, added 0.70)
- **Approval (expanded):**
  - Strongly Approve: 58.82%
  - Somewhat Approve: 41.18%
  - Somewhat Disapprove: 0.00%
  - Strongly Disapprove: 0.00%

#### Verification (Full Recomputation)

✅ Incremental update matches full recomputation (difference < 0.01%)

### (all parties) × (all ages)

#### Wave 1 State (Baseline)

- **Respondents:** 1, 2, 3, 4, 5
- **Total Weight:** 6.50
- **Approval (expanded):**
  - Strongly Approve: 38.46%
  - Somewhat Approve: 12.31%
  - Somewhat Disapprove: 18.46%
  - Strongly Disapprove: 30.77%

#### Wave 2 Incremental Data

- **New Respondents:** 11, 12, 13, 14, 15
- **Incremental Weight:** 5.50
- **New Approval Weighted Counts (expanded):**
  - Strongly Approve: 1.10
  - Somewhat Approve: 2.00
  - Somewhat Disapprove: 0.90
  - Strongly Disapprove: 1.50

#### Updated State (After Incremental Update)

- **Total Respondents:** 1, 2, 3, 4, 5, 11, 12, 13, 14, 15
- **Total Weight:** 12.00 (was 6.50, added 5.50)
- **Approval (expanded):**
  - Strongly Approve: 30.00%
  - Somewhat Approve: 23.33%
  - Somewhat Disapprove: 17.50%
  - Strongly Disapprove: 29.17%

#### Verification (Full Recomputation)

✅ Incremental update matches full recomputation (difference < 0.01%)

## Session Configuration

### Grouping Questions

**party** (demographics):
  - Democrat: values [0]
  - Republican: values [1]

**age_group** (demographics):
  - 18-34 OR 35-54: values [0,1]
  - 55+: values [2]

### Response Questions

**approval** (policy):
  - Expanded groups:
    - Strongly Approve: values [0]
    - Somewhat Approve: values [1]
    - Somewhat Disapprove: values [2]
    - Strongly Disapprove: values [3]
  - Collapsed groups:
    - Approve: values [0,1]
    - Disapprove: values [2,3]

**anger** (feelings):
  - Expanded groups:
    - none: values [0]
    - irritated: values [1]
    - hot: values [2]
    - aflame: values [3]
  - Collapsed groups:
    - some: values [0,1]
    - a lot: values [2,3]


