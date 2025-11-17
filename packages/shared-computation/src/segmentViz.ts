import type {
  ResponseGroupWithStats,
  Question,
  Group,
} from "../../shared-schemas";
import type { RespondentData } from "./types";
import { getQuestionKey } from "./utils";

interface ResponseGroupWithCount extends ResponseGroupWithStats {
  count?: number;
}

interface ResponseQuestionWithCounts extends Question {
  responseGroups: {
    expanded: ResponseGroupWithCount[];
    collapsed: ResponseGroupWithCount[];
  };
  totalWeight: number;
}

interface SplitWithCounts {
  groups: Group[];
  responseQuestions: ResponseQuestionWithCounts[];
}

export class SegmentViz {
  // Map keyed by canonical question key -> { question, respondents }
  // Using a Map gives O(1) lookup when locating the sample for a question.
  private respondentsByQuestion: Map<
    string,
    { question: Question; respondents: RespondentData[] }
  > = new Map();

  constructor(splitsWithCounts: SplitWithCounts[]) {
    // Generate a deterministic numeric respondent id for each synthetic respondent
    let nextRespondentId = 1;

    // Use shared helper to key questions for lookups

    // Find the first fully-specified split to establish the set/order of response questions
    const firstFullySpecified = splitsWithCounts.find((s) =>
      s.groups.every((g) => g.responseGroup !== null)
    );

    if (!firstFullySpecified) {
      // No fully-specified splits -> nothing to build
      return;
    }

    // Initialize samples for each response question (we assume consistent questions across splits)
    for (const rq of firstFullySpecified.responseQuestions) {
      const k = getQuestionKey(rq);
      this.respondentsByQuestion.set(k, {
        question: { ...rq },
        respondents: [],
      });
    }

    // Iterate splits and populate each question's sample
    for (const split of splitsWithCounts) {
      // Only use splits that are "fully specified": every group must have a non-null responseGroup
      const fullySpecified = split.groups.every(
        (g) => g.responseGroup !== null
      );
      if (!fullySpecified) continue;

      // For each response question in this split, locate the corresponding sample container
      for (const responseQuestion of split.responseQuestions) {
        const key = getQuestionKey(responseQuestion as Question);
        const sample = this.respondentsByQuestion.get(key);
        if (!sample) {
          // If a response question didn't appear in the first split, skip it
          continue;
        }

        // For each expanded response group, create synthetic respondents according to count
        for (const responseGroup of responseQuestion.responseGroups.expanded) {
          const count = responseGroup.count ?? 0;
          if (count <= 0) continue;

          // Pick a deterministic representative response value from the group's values
          const chosenResponseValue = responseGroup.values.length
            ? responseGroup.values[0]
            : null;

          for (let i = 0; i < count; i++) {
            const responses: RespondentData["responses"] = [];

            // Add grouping question responses (one value per grouping question)
            for (const group of split.groups) {
              const grp = group.responseGroup as { values: number[] };
              const grpValue = grp.values.length ? grp.values[0] : null;

              responses.push({
                varName: group.question.varName,
                batteryName: group.question.batteryName,
                subBattery: group.question.subBattery,
                response: grpValue,
              });
            }

            // Add the response for the response question this sample corresponds to
            responses.push({
              varName: responseQuestion.varName,
              batteryName: responseQuestion.batteryName,
              subBattery: responseQuestion.subBattery,
              response: chosenResponseValue,
            });

            // Append to the specific question's respondents array
            sample.respondents.push({
              respondentId: nextRespondentId++,
              responses,
            });
          }
        }
      }
    }
  }

  /** Return all respondent samples (one entry per response question) */
  getRespondentSamples() {
    // Return an array view of the map's values for callers that expect an array
    return Array.from(this.respondentsByQuestion.values());
  }

  /** Return the synthetic respondents for a particular response question, or undefined if not found */
  getRespondentsForQuestion(q: Question) {
    const key = getQuestionKey(q);
    return this.respondentsByQuestion.get(key)?.respondents;
  }
}
