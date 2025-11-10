/**
 * Utility to generate a human-readable report showing test data and expected outcomes.
 * This includes both Wave 1 (baseline) and Wave 2 (incremental) data, plus update scenarios.
 * 
 * Usage:
 *   npx tsx tests/fixtures/generate-test-report.ts
 */

import {
  mockSessionConfig,
  getAllMockResponses, // Wave 1 data (deprecated alias, kept for compatibility)
  getWave2MockResponses,
  getAllWavesMockResponses,
  expectedRespondentRecords,
  expectedSplits,
  expectedSplitStatistics,
  expectedUpdateResults,
} from "./mock-data";
import {
  computeSplitStatistics,
  updateSplitStatistics,
} from "../../src/computations";

const mockWeightQuestion = { varName: "weight", batteryName: "demographics", subBattery: "" };

function generateReport(): string {
  let report = "";

  report += "# Computation Test Data & Expected Results\n\n";
  report += "Generated: " + new Date().toISOString() + "\n\n";

  // Section 1: Raw Data
  report += "## Mock Respondent Data (Wave 1)\n\n";
  report += "From `mock-responses-wave1.csv`:\n\n";
  report += "| ID | Weight | Party      | Age    | Approval            | Anger     | Status  |\n";
  report += "|----|--------|------------|--------|---------------------|-----------|----------|\n";

  const responses = getAllMockResponses();
  const respondentMap = new Map<number, any>();

  // Group responses by respondent
  for (const r of responses) {
    if (!respondentMap.has(r.respondentId)) {
      respondentMap.set(r.respondentId, {});
    }
    const obj = respondentMap.get(r.respondentId);
    obj[r.varName] = r.response;
  }

  const partyLabels: Record<number, string> = { 0: "Democrat", 1: "Republican" };
  const ageLabels: Record<number, string> = { 0: "18-34", 1: "35-54", 2: "55+" };
  const approvalLabels: Record<number, string> = {
    0: "Strongly Approve",
    1: "Somewhat Approve",
    2: "Somewhat Disapprove",
    3: "Strongly Disapprove",
  };
  const angerLabels: Record<number, string> = {
    0: "none",
    1: "irritated",
    2: "hot",
    3: "aflame",
  };

  const allRespondentIds = Array.from(respondentMap.keys()).sort((a, b) => a - b);

  for (const id of allRespondentIds) {
    const data = respondentMap.get(id);
    const isValid = (expectedRespondentRecords.withWeight.includedIds as readonly number[]).includes(id);

    const weight = data.weight ?? "null";
    const party = data.party !== null && data.party !== undefined ? partyLabels[data.party] : "null";
    const age = data.age_group !== null && data.age_group !== undefined ? ageLabels[data.age_group] : "null";
    const approval = data.approval !== null && data.approval !== undefined
      ? (approvalLabels[data.approval] ?? `${data.approval} (invalid)`)
      : "null";
    const anger = data.anger !== null && data.anger !== undefined ? angerLabels[data.anger] : "null";
    const status = isValid ? "✅ valid" : "❌ invalid";

    report += `| ${id}  | ${weight.toString().padEnd(6)} | ${party.padEnd(10)} | ${age.padEnd(6)} | ${approval.padEnd(19)} | ${anger.padEnd(9)} | ${status} |\n`;
  }

  report += "\n";

  // Section 2: Invalid Respondents
  report += "## Invalid Respondents (Filtered Out)\n\n";
  report += "| ID | Reason |\n";
  report += "|----|--------|\n";

  const explanations = expectedRespondentRecords.withoutWeight.explanation.excluded;
  for (const [id, reason] of Object.entries(explanations)) {
    report += `| ${id}  | ${reason} |\n`;
  }

  report += "\n";

  // Section 2.5: Wave 2 Data
  report += "## Wave 2 Respondent Data (Incremental)\n\n";
  report += "From `mock-responses-wave2.csv`:\n\n";
  report += "| ID | Weight | Party      | Age    | Approval            | Anger     | Status  |\n";
  report += "|----|--------|------------|--------|---------------------|-----------|----------|\n";

  const wave2Responses = getWave2MockResponses();
  const wave2RespondentMap = new Map<number, any>();

  // Group Wave 2 responses by respondent
  for (const r of wave2Responses) {
    if (!wave2RespondentMap.has(r.respondentId)) {
      wave2RespondentMap.set(r.respondentId, {});
    }
    const obj = wave2RespondentMap.get(r.respondentId);
    obj[r.varName] = r.response;
  }

  const wave2RespondentIds = Array.from(wave2RespondentMap.keys()).sort((a, b) => a - b);

  for (const id of wave2RespondentIds) {
    const data = wave2RespondentMap.get(id);
    const isValid = (expectedUpdateResults.wave2Respondents.includedIds as readonly number[]).includes(id);

    const weight = data.weight ?? "null";
    const party = data.party !== null && data.party !== undefined ? partyLabels[data.party] : "null";
    const age = data.age_group !== null && data.age_group !== undefined ? ageLabels[data.age_group] : "null";
    const approval = data.approval !== null && data.approval !== undefined
      ? (approvalLabels[data.approval] ?? `${data.approval} (invalid)`)
      : "null";
    const anger = data.anger !== null && data.anger !== undefined ? angerLabels[data.anger] : "null";
    const status = isValid ? "✅ valid" : "❌ invalid";

    report += `| ${id}  | ${weight.toString().padEnd(6)} | ${party.padEnd(10)} | ${age.padEnd(6)} | ${approval.padEnd(19)} | ${anger.padEnd(9)} | ${status} |\n`;
  }

  report += "\n";
  report += `**Wave 2 Summary:**\n`;
  report += `- Valid respondents: ${expectedUpdateResults.wave2Respondents.totalCount}\n`;
  report += `- Invalid respondents: ${expectedUpdateResults.wave2Respondents.excludedIds.length}\n`;
  report += `- Total weight (valid): ${expectedUpdateResults.totalWeight.wave2}\n\n`;

  // Section 2.6: Wave 2 Invalid Respondents
  report += "## Wave 2 Invalid Respondents (Filtered Out)\n\n";
  report += "| ID | Reason |\n";
  report += "|----|--------|\n";

  const wave2Explanations = expectedUpdateResults.wave2Respondents.explanation.excluded;
  for (const [id, reason] of Object.entries(wave2Explanations)) {
    report += `| ${id}  | ${reason} |\n`;
  }

  report += "\n";

  // Section 3: Expected Splits
  report += "## Expected Splits\n\n";
  report += `Total combinations: ${expectedSplits.totalCount}\n\n`;
  report += "Session config has:\n";
  report += `- Party: 2 groups (Democrat, Republican) + null = 3 options\n`;
  report += `- Age: 2 groups (18-34 OR 35-54, 55+) + null = 3 options\n`;
  report += `- Cartesian product: 3 × 3 = ${expectedSplits.totalCount} splits\n\n`;

  report += "Split labels:\n";
  for (let i = 0; i < expectedSplits.splitLabels.length; i++) {
    report += `${i + 1}. ${expectedSplits.splitLabels[i]}\n`;
  }

  report += "\n";

  // Section 4: Sample Calculations
  report += "## Sample Split Calculations\n\n";

  const exampleSplits = [
    "Democrat × 18-34 OR 35-54",
    "Republican × 55+",
    "(all parties) × (all ages)",
  ];

  for (const splitLabel of exampleSplits) {
    const expected = expectedSplitStatistics[splitLabel as keyof typeof expectedSplitStatistics];

    report += `### ${splitLabel}\n\n`;
    report += `**Matching respondents:** ${expected.respondentIds.join(", ")}\n\n`;

    // Unweighted
    report += "#### Unweighted Calculation\n\n";
    report += `- **n =** ${expected.unweighted.n}\n`;
    report += "- **Approval (expanded):**\n";
    for (const [label, value] of Object.entries(expected.unweighted.approval.expanded)) {
      report += `  - ${label}: ${value.toFixed(4)}\n`;
    }
    report += "- **Approval (collapsed):**\n";
    for (const [label, value] of Object.entries(expected.unweighted.approval.collapsed)) {
      report += `  - ${label}: ${value.toFixed(4)}\n`;
    }

    report += "\n";

    // Weighted
    report += "#### Weighted Calculation\n\n";
    report += `- **effectiveN =** ${expected.weighted.effectiveN}\n`;
    report += "- **Approval (expanded):**\n";
    for (const [label, value] of Object.entries(expected.weighted.approval.expanded)) {
      report += `  - ${label}: ${value.toFixed(4)}\n`;
    }
    report += "- **Approval (collapsed):**\n";
    for (const [label, value] of Object.entries(expected.weighted.approval.collapsed)) {
      report += `  - ${label}: ${value.toFixed(4)}\n`;
    }

    report += "\n";
  }

  // Section 4.5: Incremental Update Scenarios
  report += "## Incremental Update Scenarios\n\n";
  report += "Demonstrating `updateSplitStatistics()` with Wave 1 → Wave 2 updates.\n\n";

  // Compute Wave 1 statistics
  const wave1Responses = getAllMockResponses();

  const wave1Stats = computeSplitStatistics(
    wave1Responses,
    mockSessionConfig,
    mockWeightQuestion
  );

  // Apply Wave 2 update
  const updateResult = updateSplitStatistics(
    wave1Stats.statistics,
    wave1Stats.totalWeight,
    getWave2MockResponses(),
    mockSessionConfig,
    mockWeightQuestion
  );

  // Compute combined (full recomputation for verification)
  const combinedStats = computeSplitStatistics(
    getAllWavesMockResponses(),
    mockSessionConfig,
    mockWeightQuestion
  );

  const updateExamples = [
    "Democrat × 18-34 OR 35-54",
    "Democrat × 55+",
    "(all parties) × (all ages)",
  ];

  for (const splitLabel of updateExamples) {
    report += `### ${splitLabel}\n\n`;

    // Find the split in all three computations
    const findSplit = (stats: typeof wave1Stats.statistics, label: string) => {
      if (label === "(all parties) × (all ages)") {
        return stats.find(s => s.groups.every(g => g.responseGroup === null));
      }
      const [partyLabel, ageLabel] = label.split(" × ");
      return stats.find(s => {
        const partyGroup = s.groups.find(g => g.question.varName === "party");
        const ageGroup = s.groups.find(g => g.question.varName === "age_group");
        return (
          (partyLabel === "(all parties)" ? partyGroup?.responseGroup === null : partyGroup?.responseGroup?.label === partyLabel) &&
          (ageLabel === "(all ages)" ? ageGroup?.responseGroup === null : ageGroup?.responseGroup?.label === ageLabel)
        );
      });
    };

    const wave1Split = findSplit(wave1Stats.statistics, splitLabel);
    const updatedSplit = findSplit(updateResult.updatedStatistics, splitLabel);
    const combinedSplit = findSplit(combinedStats.statistics, splitLabel);

    if (!wave1Split || !updatedSplit || !combinedSplit) {
      report += `❌ Split not found in computations\n\n`;
      continue;
    }

    // Get expected data
    const expectedData = expectedUpdateResults.splits[splitLabel as keyof typeof expectedUpdateResults.splits];
    if (!expectedData) {
      report += `⚠️  No expected data for this split\n\n`;
      continue;
    }

    report += "#### Wave 1 State (Baseline)\n\n";
    report += `- **Respondents:** ${expectedData.wave1.respondentIds.join(", ")}\n`;
    report += `- **Total Weight:** ${wave1Split.totalWeight.toFixed(2)}\n`;
    const approvalQ1 = wave1Split.responseQuestions.find(q => q.varName === "approval");
    if (approvalQ1) {
      report += "- **Approval (expanded):**\n";
      for (const group of approvalQ1.responseGroups.expanded) {
        report += `  - ${group.label}: ${(group.proportion * 100).toFixed(2)}%\n`;
      }
    }
    report += "\n";

    report += "#### Wave 2 Incremental Data\n\n";
    report += `- **New Respondents:** ${expectedData.wave2.wave2RespondentIds.join(", ")}\n`;
    report += `- **Incremental Weight:** ${expectedData.wave2.incrementalWeight.toFixed(2)}\n`;
    if (expectedData.wave2.weightedCounts.approval) {
      report += "- **New Approval Weighted Counts (expanded):**\n";
      for (const [label, count] of Object.entries(expectedData.wave2.weightedCounts.approval.expanded)) {
        report += `  - ${label}: ${count.toFixed(2)}\n`;
      }
    }
    report += "\n";

    report += "#### Updated State (After Incremental Update)\n\n";
    report += `- **Total Respondents:** ${[...expectedData.wave1.respondentIds, ...expectedData.wave2.wave2RespondentIds].join(", ")}\n`;
    report += `- **Total Weight:** ${updatedSplit.totalWeight.toFixed(2)} (was ${wave1Split.totalWeight.toFixed(2)}, added ${expectedData.wave2.incrementalWeight.toFixed(2)})\n`;
    const approvalQ2 = updatedSplit.responseQuestions.find(q => q.varName === "approval");
    if (approvalQ2) {
      report += "- **Approval (expanded):**\n";
      for (const group of approvalQ2.responseGroups.expanded) {
        report += `  - ${group.label}: ${(group.proportion * 100).toFixed(2)}%\n`;
      }
    }
    report += "\n";

    report += "#### Verification (Full Recomputation)\n\n";
    const approvalQ3 = combinedSplit.responseQuestions.find(q => q.varName === "approval");
    if (approvalQ2 && approvalQ3) {
      let allMatch = true;
      for (let i = 0; i < approvalQ2.responseGroups.expanded.length; i++) {
        const updatedProp = approvalQ2.responseGroups.expanded[i].proportion;
        const fullProp = approvalQ3.responseGroups.expanded[i].proportion;
        const diff = Math.abs(updatedProp - fullProp);
        if (diff > 0.0001) {
          allMatch = false;
          report += `⚠️  ${approvalQ2.responseGroups.expanded[i].label}: Incremental=${(updatedProp * 100).toFixed(4)}%, Full=${(fullProp * 100).toFixed(4)}%, Diff=${(diff * 100).toFixed(4)}%\n`;
        }
      }
      if (allMatch) {
        report += `✅ Incremental update matches full recomputation (difference < 0.01%)\n`;
      }
    }
    report += "\n";
  }

  // Section 5: Session Config
  report += "## Session Configuration\n\n";
  report += "### Grouping Questions\n\n";
  for (const q of mockSessionConfig.groupingQuestions) {
    report += `**${q.varName}** (${q.batteryName}):\n`;
    for (const rg of q.responseGroups) {
      report += `  - ${rg.label}: values ${JSON.stringify(rg.values)}\n`;
    }
    report += "\n";
  }

  report += "### Response Questions\n\n";
  for (const q of mockSessionConfig.responseQuestions) {
    report += `**${q.varName}** (${q.batteryName}):\n`;
    report += "  - Expanded groups:\n";
    for (const rg of q.responseGroups.expanded) {
      report += `    - ${rg.label}: values ${JSON.stringify(rg.values)}\n`;
    }
    report += "  - Collapsed groups:\n";
    for (const rg of q.responseGroups.collapsed) {
      report += `    - ${rg.label}: values ${JSON.stringify(rg.values)}\n`;
    }
    report += "\n";
  }

  return report;
}

// Generate and print the report
if (require.main === module) {
  console.log(generateReport());
}

export { generateReport };
