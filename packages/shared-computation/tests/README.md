# Test Fixtures for Statistics and SegmentViz

This directory contains test fixtures and helper utilities for testing the Statistics and SegmentViz classes.

## Structure

```
tests/
├── fixtures/
│   ├── index.ts           # Main export point
│   ├── test-data.ts       # Core test data and expected values
│   └── helpers.ts         # Transformation utilities
└── examples/
    └── fixture-usage.example.ts  # Usage examples
```

## Test Data Organization

The test fixtures are organized using **Split-Organized Tabular Format**, which prioritizes:

1. **Human readability**: Data is organized in simple tabular structures
2. **Easy hand-calculation**: Small integer weights and clear patterns make verification trivial
3. **Split-awareness**: Data is grouped by which fully-specified split it belongs to

### Data Structure

The fixtures include:

- **2 Grouping Questions**: `age` (young/old), `gender` (male/female)
- **1 Response Question**: `favorability` with 4 expanded groups and 2 collapsed groups
- **1 Weight Question**: Integer weights for easy calculation
- **2 Data Waves**: For testing incremental updates

### Populated Splits

The test data populates exactly **2 fully-specified splits**:

1. **Young Males** (age=1, gender=1): 3 respondents in wave 1, +1 in wave 2
2. **Old Females** (age=2, gender=2): 4 respondents in wave 1, +2 in wave 2

This creates a clean test scenario where:

- Multiple splits can be verified independently
- Aggregated splits (with nulls) can be verified against the sum of fully-specified splits
- Deltas from wave 2 are easy to hand-calculate

## Usage

### Basic Usage

```typescript
import { Statistics, type StatsConfig } from "../src/statistics";
import {
  wave1Data,
  ageGroupingQuestion,
  genderGroupingQuestion,
  favorabilityResponseQuestion,
  weightQuestion,
  flattenWaveData,
} from "./fixtures";

// Create configuration
const config: StatsConfig = {
  responseQuestions: [favorabilityResponseQuestion],
  groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
};

// Transform and use wave 1 data
const wave1Respondents = flattenWaveData(wave1Data);
const stats = new Statistics(config, wave1Respondents, weightQuestion);
```

### Incremental Updates

```typescript
import { wave2Data, flattenWaveData } from "./fixtures";

// Update with wave 2
const wave2Respondents = flattenWaveData(wave2Data);
const updateResult = stats.updateSplits(wave2Respondents);
```

### Verification Against Expected Values

```typescript
import { expectedWave1Stats } from "./fixtures";

const splits = stats.getSplits();
const youngMalesSplit = splits.find(
  (split) =>
    split.groups[0].responseGroup?.label === "young" &&
    split.groups[1].responseGroup?.label === "male"
);

const favQuestion = youngMalesSplit.responseQuestions[0];
expect(favQuestion.totalCount).toBe(
  expectedWave1Stats.youngMales.favorability.totalCount
);
expect(favQuestion.totalWeight).toBe(
  expectedWave1Stats.youngMales.favorability.totalWeight
);
```

## Expected Values

All expected statistics are **hand-calculated** and documented inline in `test-data.ts`. For example:

### Wave 1 - Young Males Split

```
Respondents:
- id 1: strongly_favorable (1), weight 2
- id 2: favorable (2), weight 2
- id 3: unfavorable (3), weight 1

Expected:
- totalCount: 3
- totalWeight: 5 (= 2 + 2 + 1)
- strongly_favorable: count=1, weight=2, proportion=2/5
- favorable: count=1, weight=2, proportion=2/5
- unfavorable: count=1, weight=1, proportion=1/5
```

The calculations are simple enough to verify mentally or with basic arithmetic.

## Helper Functions

### `flattenWaveData(waveData)`

Flattens split-organized data into a single array of `RespondentData[]`.

```typescript
const wave1Respondents = flattenWaveData(wave1Data);
// Returns all respondents from all splits in wave 1
```

### `combineWaves(...waves)`

Combines multiple waves into a single array.

```typescript
const allRespondents = combineWaves(wave1Data, wave2Data);
// Returns all respondents from both waves
```

### `tabularToRespondentData(tabular)`

Converts a single tabular respondent to `RespondentData` format.

```typescript
const respondent = tabularToRespondentData({
  id: 1,
  age: 1,
  gender: 1,
  favorability: 1,
  weight: 2,
});
```

## Examples

See `examples/fixture-usage.example.ts` for complete working examples of:

- Basic Statistics instantiation
- Incremental updates
- Static computation methods
- Finding and verifying specific splits

## Design Rationale

### Why Split-Organized Tables?

1. **Clarity**: Immediately obvious which respondents belong to which split
2. **Verification**: Hand-calculation is trivial with small, grouped datasets
3. **Maintainability**: Easy to add/modify test cases
4. **Documentation**: The data structure itself documents the test scenario

### Why Integer Weights?

While production uses floating-point weights, integer weights in tests make proportion calculations trivial:

- `proportion = weight / totalWeight`
- With integers: `2/5 = 0.4` is easy to verify
- No floating-point precision issues in assertions

### Why Two Splits?

Testing 2 fully-specified splits provides:

- **Multi-split verification**: Ensures split logic works correctly
- **Aggregation testing**: The "all respondents" split aggregates both, making it verifiable
- **Manageable complexity**: More splits would make hand-calculation harder
- **Complete coverage**: Exercises all critical code paths without overwhelming detail

## Future Extensions

When adding new test scenarios, consider:

- Adding test cases with invalid/null responses
- Testing edge cases (all same response, all different responses)
- Testing with missing weight question
- Testing with more response questions
- Testing with different collapsed group configurations
