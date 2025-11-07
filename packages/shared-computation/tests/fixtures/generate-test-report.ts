/**
 * Utility to generate a human-readable report showing test data and expected outcomes.
 * This can be used for documentation or debugging purposes.
 * 
 * Usage:
 *   npx tsx tests/fixtures/generate-test-report.ts
 */

import {
  mockSessionConfig,
  getAllMockResponses,
  expectedRespondentRecords,
  expectedSplits,
  expectedSplitStatistics,
} from "./mock-data";

function generateReport(): string {
  let report = "";

  report += "# Computation Test Data & Expected Results\n\n";
  report += "Generated: " + new Date().toISOString() + "\n\n";

  // Section 1: Raw Data
  report += "## Mock Respondent Data\n\n";
  report += "From `mock-responses.csv`:\n\n";
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
