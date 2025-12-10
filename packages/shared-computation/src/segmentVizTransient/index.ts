import { SegmentVizConfig, SplitWithSegmentGroup } from "./types";
import { GroupingQuestion, Group, ResponseGroup } from '../types';


function generateCartesian(groupingQuestions: GroupingQuestion[]): { groups: Group[] }[] {
  // Start with a single empty combination
  let combinations: (ResponseGroup | null)[][] = [[]];

  // For each grouping question, expand combinations with its response groups + null
  for (const groupingQuestion of groupingQuestions) {
    const newCombinations: (ResponseGroup | null)[][] = [];

    // Options for this question: all response groups + null (for "all")
    const options: (ResponseGroup | null)[] = [...groupingQuestion.responseGroups, null];

    // Expand each existing combination with each option
    for (const combination of combinations) {
      for (const option of options) {
        newCombinations.push([...combination, option]);
      }
    }

    combinations = newCombinations;
  }

  // Convert each combination into an object with groups array
  const result: { groups: Group[] }[] = [];

  for (const combination of combinations) {
    // Build the groups array for this combination
    const groups: Group[] = [];

    for (let i = 0; i < groupingQuestions.length; i++) {
      const question = groupingQuestions[i];
      const responseGroup = combination[i]; // Can be ResponseGroup or null

      groups.push({
        question: {
          varName: question.varName,
          batteryName: question.batteryName,
          subBattery: question.subBattery,
        },
        responseGroup: responseGroup,
      });
    }

    result.push({ groups });
  }

  return result;
}

export function getBasisSplitIndices(groups: Group[], fullCartesian: { groups: Group[] }[]): number[] {
  const basisIndices: number[] = [];

  for (let i = 0; i < fullCartesian.length; i++) {
    const candidateSplit = fullCartesian[i].groups;

    // Check if this split is fully specified (no nulls)
    const isFullySpecified = candidateSplit.every(group => group.responseGroup !== null);

    if (!isFullySpecified) {
      continue; // Skip non-fully-specified splits
    }

    // Check if this fully specified split matches the pattern in groups
    let matches = true;
    for (let j = 0; j < groups.length; j++) {
      const groupRG = groups[j].responseGroup;

      // If groups[j] has a non-null responseGroup, the candidate must match it
      if (groupRG !== null) {
        // Compare responseGroup by checking if they're the same object or have the same label and values
        const candidateRG = candidateSplit[j].responseGroup;

        if (candidateRG === null ||
          groupRG.label !== candidateRG.label ||
          groupRG.values.length !== candidateRG.values.length ||
          !groupRG.values.every((val, idx) => val === candidateRG.values[idx])) {
          matches = false;
          break;
        }
      }
      // If groups[j].responseGroup is null, any value in the candidate matches
    }

    if (matches) {
      basisIndices.push(i);
    }
  }

  return basisIndices;
}

export function createSegmentViz(segmentVizConfig: SegmentVizConfig): SplitWithSegmentGroup[] {
  //===========================================
  // VALIDATE THE SEGMENT VIZ CONFIG
  //===========================================

  //x and y grouping questions distinct

  //x and y grouping questions do not include response question

  //all lengths non-negative or positive (depending on length)

  //===========================================
  // COMPUTE THE VIZ WIDTH and VIZ HEIGHT
  //===========================================

  //===========================================
  // INITIALIZE THE EMPTY SPLIT-WITH-SEGMENT-GROUP ARRAY
  //===========================================

  generateCartesian([...segmentVizConfig.groupingQuestions.x, ...segmentVizConfig.groupingQuestions.y])
    .map(({ groups }, _splitIdx, fullCartesian) => ({
      groups: groups,
      basisSplitIndices: getBasisSplitIndices(groups, fullCartesian),
      totalWeight: 0,
      totalCount: 0,
      //TODO -- responseGroups, pointIds, segmentGroupBounds
    }))

  // TODO: return the SplitWithSegmentGroup array
  return [];
}

