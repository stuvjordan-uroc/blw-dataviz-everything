import type { SegmentVizConfig } from "./types";
import { Statistics, type StatsConfig } from "../statistics";
import { getQuestionKey } from "../utils";

export function validateConfig(
  statsInstanceRef: Statistics,
  segmentVizConfig: SegmentVizConfig
) {
  // Helper for duplicate check
  const hasDuplicates = (arr: string[]) => new Set(arr).size !== arr.length;

  // responseQuestionKeys has length at least 1.
  if (
    !segmentVizConfig.responseQuestionKeys ||
    segmentVizConfig.responseQuestionKeys.length < 1
  ) {
    throw new Error(
      "SegmentVizConfig: 'responseQuestionKeys' must contain at least one key."
    );
  }

  // responseQuestionsKeys has no repeats
  if (hasDuplicates(segmentVizConfig.responseQuestionKeys)) {
    throw new Error(
      "SegmentVizConfig: 'responseQuestionKeys' contains duplicate keys."
    );
  }

  // if groupingQuestionKeys.x has positive length, it has no repeats
  if (
    segmentVizConfig.groupingQuestionKeys.x &&
    segmentVizConfig.groupingQuestionKeys.x.length > 0
  ) {
    if (hasDuplicates(segmentVizConfig.groupingQuestionKeys.x)) {
      throw new Error(
        "SegmentVizConfig: 'groupingQuestionKeys.x' contains duplicate keys."
      );
    }
  }

  // if groupingQuestionKeys.y has positive length, it has no repeats
  if (
    segmentVizConfig.groupingQuestionKeys.y &&
    segmentVizConfig.groupingQuestionKeys.y.length > 0
  ) {
    if (hasDuplicates(segmentVizConfig.groupingQuestionKeys.y)) {
      throw new Error(
        "SegmentVizConfig: 'groupingQuestionKeys.y' contains duplicate keys."
      );
    }
  }

  // groupingQuestionKeys.x and groupingQuestionKeys.y are disjoint
  const setX = new Set(segmentVizConfig.groupingQuestionKeys.x || []);
  for (const key of segmentVizConfig.groupingQuestionKeys.y || []) {
    if (setX.has(key)) {
      throw new Error(
        "SegmentVizConfig: 'groupingQuestionKeys.x' and 'groupingQuestionKeys.y' must be disjoint."
      );
    }
  }

  // Access sessionConfig from stats instance
  // Access sessionConfig from stats instance via the public getter added to Statistics
  const scAccessor = statsInstanceRef as unknown as {
    getStatsConfig?: () => StatsConfig;
  };
  const sessionConfig = scAccessor.getStatsConfig
    ? scAccessor.getStatsConfig()
    : undefined;
  if (!sessionConfig) {
    throw new Error(
      "validateConfig: Unable to access sessionConfig from Statistics instance."
    );
  }

  // Build sets of valid question keys from sessionConfig
  const validResponseQuestionKeys = new Set(
    sessionConfig.responseQuestions.map((rq) => getQuestionKey(rq))
  );
  const validGroupingQuestionKeys = new Set(
    sessionConfig.groupingQuestions.map((gq) => getQuestionKey(gq))
  );

  // every key in responseQuestionKeys matches one question key in sessionConfig.responseQuestions
  for (const key of segmentVizConfig.responseQuestionKeys) {
    if (!validResponseQuestionKeys.has(key)) {
      throw new Error(
        `SegmentVizConfig: responseQuestionKey '${key}' does not match any response question in sessionConfig.`
      );
    }
  }

  // every key in groupingQuestionKeys.x and groupingQuestionKeys.y matches one question key in sessionConfig.groupingQuestions
  for (const key of [
    ...(segmentVizConfig.groupingQuestionKeys.x || []),
    ...(segmentVizConfig.groupingQuestionKeys.y || []),
  ]) {
    if (!validGroupingQuestionKeys.has(key)) {
      throw new Error(
        `SegmentVizConfig: grouping question key '${key}' does not match any grouping question in sessionConfig.`
      );
    }
  }

  // if syntheticSampleSize is defined, it is strictly positive
  if (
    segmentVizConfig.syntheticSampleSize !== undefined &&
    segmentVizConfig.syntheticSampleSize !== null
  ) {
    if (
      typeof segmentVizConfig.syntheticSampleSize !== "number" ||
      !(segmentVizConfig.syntheticSampleSize > 0)
    ) {
      throw new Error(
        "SegmentVizConfig: 'syntheticSampleSize' must be a number greater than 0 when defined."
      );
    }
  }

  // all lengths are strictly positive
  const lengthFields: Array<[keyof SegmentVizConfig, number]> = [
    ["minGroupAvailableWidth", segmentVizConfig.minGroupAvailableWidth],
    ["minGroupHeight", segmentVizConfig.minGroupHeight],
    ["groupGapX", segmentVizConfig.groupGapX],
    ["groupGapY", segmentVizConfig.groupGapY],
    ["responseGap", segmentVizConfig.responseGap],
  ];

  for (const [name, value] of lengthFields) {
    if (typeof value !== "number" || !(value > 0)) {
      throw new Error(
        `SegmentVizConfig: '${String(name)}' must be a number greater than 0.`
      );
    }
  }
}
