# shared-computation

Shared computation functions for statistics and data processing across the monorepo.

## Purpose

This package provides pure computation functions that can be used by multiple services throughout the application. It includes:

- **Statistics computation**: Functions to compute poll response statistics and proportions
- **Incremental updates**: Efficient algorithms to update statistics with new data
- **Data aggregation**: Helper functions for grouping and filtering responses

## Usage

### Computing Split Statistics

```typescript
import {
  computeSplitStatistics,
  updateSplitStatistics,
  type ResponseData,
  type QuestionKey,
} from "shared-computation";

// Unweighted computation (default)
// Each respondent contributes equally to proportions
const splits = computeSplitStatistics(allResponses, sessionConfig);

// Weighted computation
// Proportions are weighted by values from a specific question
// (e.g., survey weights, demographic weights)
const weightQuestion: QuestionKey = {
  varName: "weight",
  batteryName: "demographics",
  subBattery: "",
};
const weightedSplits = computeSplitStatistics(
  allResponses,
  sessionConfig,
  weightQuestion
);

// Incremental update with new responses (unweighted)
const updatedSplits = updateSplitStatistics(
  currentStatistics,
  newResponses,
  sessionConfig,
  100, // previousTotal (respondent count)
  120 // newTotal (respondent count after adding new responses)
);

// Incremental update with new responses (weighted)
const updatedWeightedSplits = updateSplitStatistics(
  currentStatistics,
  newResponses,
  sessionConfig,
  1523.4, // previousTotal (sum of weights from previous computation)
  1811.0, // newTotal (sum of all weights including new responses)
  weightQuestion
);
```

### Weighted vs Unweighted Proportions

**Unweighted**: Each respondent counts as 1. The proportion is calculated as:

```
proportion = respondents_in_group / total_respondents
```

**Weighted**: Each respondent's contribution is determined by their weight value. The proportion is:

```
proportion = sum_of_weights_in_group / sum_of_total_weights
```

The weight must be stored as a response to a specific question (identified by `QuestionKey`). If a respondent has no weight response or it's null, they default to a weight of 1.0.

## Design Principles

- **Pure functions**: All computation functions are pure (no side effects)
- **Framework agnostic**: No dependencies on NestJS, Drizzle, or other framework-specific code
- **Type safe**: Full TypeScript support with exported types
- **Testable**: Easy to unit test with predictable inputs and outputs
