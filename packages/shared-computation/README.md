# shared-computation

Shared computation functions for statistics and data processing across the monorepo.

## Purpose

This package provides pure computation functions that can be used by multiple services throughout the application. It includes:

- **Statistics computation**: Functions to compute poll response statistics and proportions
- **Incremental updates**: Efficient algorithms to update statistics with new data
- **Data aggregation**: Helper functions for grouping and filtering responses

## Usage

```typescript
import {
  computeSplitStatistics,
  updateSplitStatistics,
  type ResponseData,
} from "shared-computation";

// Full computation from scratch
const splits = computeSplitStatistics(allResponses, sessionConfig);

// Incremental update with new responses
const updatedSplits = updateSplitStatistics(
  currentStatistics,
  newResponses,
  sessionConfig,
  previousRespondentCount,
  newRespondentCount
);
```

## Design Principles

- **Pure functions**: All computation functions are pure (no side effects)
- **Framework agnostic**: No dependencies on NestJS, Drizzle, or other framework-specific code
- **Type safe**: Full TypeScript support with exported types
- **Testable**: Easy to unit test with predictable inputs and outputs
