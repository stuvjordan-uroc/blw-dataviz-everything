/**
 * Example demonstrating how to use the test fixtures.
 *
 * This is a reference implementation showing the intended usage patterns.
 * Actual test files will follow similar patterns.
 */

import { Statistics, type StatsConfig } from "../../src/statistics";
import type { Split } from "../../src/types";
import {
  wave1Data,
  wave2Data,
  ageGroupingQuestion,
  genderGroupingQuestion,
  favorabilityResponseQuestion,
  weightQuestion,
  expectedWave1Stats,
  expectedWave2Stats,
  flattenWaveData,
  combineWaves,
} from "../fixtures";

/**
 * Example: Basic Statistics usage with fixtures
 */
function exampleBasicUsage() {
  // 1. Define the configuration
  const config: StatsConfig = {
    responseQuestions: [favorabilityResponseQuestion],
    groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
  };

  // 2. Transform wave 1 data into RespondentData format
  const wave1Respondents = flattenWaveData(wave1Data);

  // 3. Create Statistics instance with initial data
  const stats = new Statistics(config, wave1Respondents, weightQuestion);

  // 4. Get the computed splits
  const splits = stats.getSplits();

  // 5. Verify against expected values
  // (This is where actual test assertions would go)
  console.log(
    "Total respondents processed:",
    stats.getTotalRespondentsProcessed()
  );
  console.log("Valid respondents:", stats.getValidRespondentsCount());
  console.log("Number of splits:", splits.length);

  // Example: Access the "young males" split (age=1, gender=1)
  const youngMalesSplit = splits.find(
    (split: Split) =>
      split.groups[0].responseGroup?.label === "young" &&
      split.groups[1].responseGroup?.label === "male"
  );

  if (youngMalesSplit) {
    const favQuestion = youngMalesSplit.responseQuestions[0];
    console.log("\nYoung Males - Favorability:");
    console.log(
      "  Total count:",
      favQuestion.totalCount,
      "(expected:",
      expectedWave1Stats.youngMales.favorability.totalCount,
      ")"
    );
    console.log(
      "  Total weight:",
      favQuestion.totalWeight,
      "(expected:",
      expectedWave1Stats.youngMales.favorability.totalWeight,
      ")"
    );

    // Check expanded groups
    const stronglyFav = favQuestion.responseGroups.expanded.find(
      (g) => g.label === "strongly_favorable"
    );
    if (stronglyFav) {
      console.log(
        "  Strongly Favorable proportion:",
        stronglyFav.proportion,
        "(expected:",
        expectedWave1Stats.youngMales.favorability.expanded.strongly_favorable
          .proportion,
        ")"
      );
    }
  }
}

/**
 * Example: Incremental update with wave 2
 */
function exampleIncrementalUpdate() {
  const config: StatsConfig = {
    responseQuestions: [favorabilityResponseQuestion],
    groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
  };

  // Start with wave 1
  const wave1Respondents = flattenWaveData(wave1Data);
  const stats = new Statistics(config, wave1Respondents, weightQuestion);

  console.log("After Wave 1:");
  console.log("  Total respondents:", stats.getTotalRespondentsProcessed());

  // Update with wave 2
  const wave2Respondents = flattenWaveData(wave2Data);
  const updateResult = stats.updateSplits(wave2Respondents);

  console.log("\nWave 2 Update Result:");
  console.log("  New respondents processed:", updateResult.totalProcessed);
  console.log("  Valid:", updateResult.validCount);
  console.log("  Number of splits with changes:", updateResult.deltas.length);

  console.log("\nAfter Wave 2:");
  console.log("  Total respondents:", stats.getTotalRespondentsProcessed());

  // Verify cumulative statistics match expected wave2 values
  const splits = stats.getSplits();
  const youngMalesSplit = splits.find(
    (split: Split) =>
      split.groups[0].responseGroup?.label === "young" &&
      split.groups[1].responseGroup?.label === "male"
  );

  if (youngMalesSplit) {
    const favQuestion = youngMalesSplit.responseQuestions[0];
    console.log("\nYoung Males - Favorability (cumulative):");
    console.log(
      "  Total count:",
      favQuestion.totalCount,
      "(expected:",
      expectedWave2Stats.youngMales.favorability.totalCount,
      ")"
    );
    console.log(
      "  Total weight:",
      favQuestion.totalWeight,
      "(expected:",
      expectedWave2Stats.youngMales.favorability.totalWeight,
      ")"
    );
  }
}

/**
 * Example: Static computation method
 */
function exampleStaticComputation() {
  const config: StatsConfig = {
    responseQuestions: [favorabilityResponseQuestion],
    groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
  };

  // Combine both waves for batch processing
  const allRespondents = combineWaves(wave1Data, wave2Data);

  // Use static method to compute statistics
  const result = Statistics.computeStatistics(
    config,
    allRespondents,
    weightQuestion
  );

  console.log("Static Computation Result:");
  console.log("  Total processed:", result.totalProcessed);
  console.log("  Valid:", result.validCount);
  console.log("  Invalid:", result.invalidCount);
  console.log("  Number of splits:", result.splits.length);

  // Results should match expectedWave2Stats since we included both waves
}

/**
 * Example: Finding specific splits
 */
function exampleFindingSplits() {
  const config: StatsConfig = {
    responseQuestions: [favorabilityResponseQuestion],
    groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
  };

  const wave1Respondents = flattenWaveData(wave1Data);
  const stats = new Statistics(config, wave1Respondents, weightQuestion);
  const splits = stats.getSplits();

  console.log("Total splits:", splits.length);

  // Find the "all respondents" split (both groups are null)
  const allRespondentsSplit = splits.find(
    (split: Split) =>
      split.groups[0].responseGroup === null &&
      split.groups[1].responseGroup === null
  );

  if (allRespondentsSplit) {
    const favQuestion = allRespondentsSplit.responseQuestions[0];
    console.log("\nAll Respondents - Favorability:");
    console.log(
      "  Total count:",
      favQuestion.totalCount,
      "(expected:",
      expectedWave1Stats.allRespondents.favorability.totalCount,
      ")"
    );
    console.log(
      "  Total weight:",
      favQuestion.totalWeight,
      "(expected:",
      expectedWave1Stats.allRespondents.favorability.totalWeight,
      ")"
    );

    // Check collapsed groups
    const allFavorable = favQuestion.responseGroups.collapsed.find(
      (g) => g.label === "all_favorable"
    );
    if (allFavorable) {
      console.log(
        "  All Favorable proportion:",
        allFavorable.proportion,
        "(expected:",
        expectedWave1Stats.allRespondents.favorability.collapsed.all_favorable
          .proportion,
        ")"
      );
    }
  }

  // Find a partially specified split (e.g., age=young, gender=null)
  const youngAllGendersSplit = splits.find(
    (split: Split) =>
      split.groups[0].responseGroup?.label === "young" &&
      split.groups[1].responseGroup === null
  );

  if (youngAllGendersSplit) {
    console.log("\nYoung (all genders) split exists");
    // This split aggregates young males + young females
    // In our fixtures, we only have young males, so it should match young males exactly
  }
}

// Export examples for potential use in documentation or interactive demos
export {
  exampleBasicUsage,
  exampleIncrementalUpdate,
  exampleStaticComputation,
  exampleFindingSplits,
};
