import type {
  Split,
  SessionConfig,
  Question,
} from "shared-schemas";

import { Statistics } from "./statistics";
import type { RespondentData } from "./types";

// Core types used by the viz computation
export interface Point {
  // unique id for the point (optional, useful for diffs)
  id?: string | number;
  x: number;
  y: number;
  // radius is optional; renderer may use VizConfig.pointRadius
  r?: number;
  // additional payload references (question, split key, original respondent id)
  meta?: Record<string, unknown>;
}

export interface ComputeOptions {
  strict?: boolean; // whether to run full validation on splits before computing
  epsilon?: number; // numeric tolerance for comparisons
}

export interface ValidationError {
  path?: string;
  message: string;
  details?: unknown;
}

export interface ValidationReport {
  ok: boolean;
  errors: ValidationError[];
  // optional diagnostics
  missingKeys?: string[];
  extraKeys?: string[];
  duplicates?: string[];
}

/**
 * Compute coordinates for a points-in-segments visualization.
 *
 * NOTE: the actual layout algorithm is intentionally left as TODO. This scaffold
 * provides the public API, types, and validation hook points. Implementation
 * of the placement strategy (packing points into segments, jitter, ordering,
 * distribution across segment rectangles, etc.) should be added later.
 */
// Minimal local VizConfig replica (exported VizConfig isn't re-exported from
// `shared-schemas` index, so we keep a local compatible shape here).
export interface VizConfigLocal {
  vizWidth: number;
  vizHeight: number;
  pointRadius: number;
  responseGap: number;
  groupsVertical: Question[];
  groupsHorizontal: Question[];
  groupGapVertical: number;
  groupGapHorizontal: number;
}

export function computeSegmentCoordinates(
  splits: Split[],
  vizConfig: VizConfigLocal,
  opts?: ComputeOptions
): Record<string, Point[]> {
  // TODO: implement validation and coordinate computation.
  // - If opts?.strict is true then call `validateSplitsForViz` and throw on errors.
  // - For now return an empty map keyed by responseQuestion varName.

  // Placeholder return shape: one empty array for each response question varName
  const result: Record<string, Point[]> = {};

  if (!splits || !Array.isArray(splits)) {
    return result;
  }

  // Reference opts to avoid unused-var lint in placeholder code
  void opts;

  // Build keys from the first split's responseQuestions (best-effort)
  const first = splits[0];
  if (first && Array.isArray(first.responseQuestions)) {
    for (const rq of first.responseQuestions) {
      const varName = rq.varName || `${rq.batteryName}:${rq.subBattery}`;
      result[varName] = [];
    }
  }

  return result;
}

export interface ValidateOptions {
  strict?: boolean; // whether to throw on validation failures
  epsilon?: number; // numeric tolerance
  // maxCombinations: optional guard to avoid expensive enumeration
  maxCombinations?: number;
}

/**
 * Validate that the provided `splits` align with the `sessionConfig` and are
 * suitable inputs for the segment-coordinate generator.
 *
 * The validation here should perform the canonical-key checks described in
 * the design document: expected count, one-per-combination, duplicates, and
 * basic per-split content checks (lengths, totalWeights >= 0, proportions
 * in [0,1], etc.). Implementation is left as TODO.
 */
export function validateSplitsForViz(
  sessionConfig: SessionConfig,
  splits: Split[],
  opts?: ValidateOptions
): ValidationReport {
  // TODO: implement full validation algorithm (generateExpectedKeys,
  // canonicalize splits, compare expected vs actual, per-split content checks)

  // Minimal placeholder implementation: sanity checks and empty report
  const report: ValidationReport = { ok: true, errors: [] };

  // reference opts to avoid unused-variable lint in this scaffold
  void opts;

  if (!sessionConfig) {
    report.ok = false;
    report.errors.push({ message: "missing sessionConfig" });
    return report;
  }

  if (!Array.isArray(splits)) {
    report.ok = false;
    report.errors.push({ message: "splits must be an array" });
    return report;
  }

  return report;
}

/**
 * Convenience wrapper: compute coordinates directly from respondent data.
 *
 * This composes `Statistics.computeStatistics(...)` and
 * `computeSegmentCoordinates(...)` so callers can get coordinates in one call.
 * The wrapper returns both the computed coordinates and the canonical splits
 * produced by `Statistics.computeStatistics` so callers may persist or inspect
 * splits as a first-class object.
 */
export function computeCoordinatesFromResponses(
  sessionConfig: SessionConfig,
  respondentsData: RespondentData[],
  vizConfig: VizConfigLocal,
  weightQuestion?: Question,
  existingSplits?: Split[],
  opts?: ComputeOptions
): {
  splits: Split[];
  coordinates: Record<string, Point[]>;
  summary: {
    validCount: number;
    invalidCount: number;
    totalProcessed: number;
  };
} {
  // Use Statistics to compute or update splits
  const statsResult = Statistics.computeStatistics(
    sessionConfig,
    respondentsData || [],
    weightQuestion,
    existingSplits
  );

  const splits = statsResult.splits;

  // Optionally validate splits if strict
  if (opts?.strict) {
    const v = validateSplitsForViz(sessionConfig, splits, { strict: true });
    if (!v.ok) {
      const err = new Error(`split validation failed: ${JSON.stringify(v.errors)}`);
      throw err;
    }
  }

  // Compute coordinates (actual placement logic is TODO)
  const coordinates = computeSegmentCoordinates(splits, vizConfig, opts);

  return {
    splits,
    coordinates,
    summary: {
      validCount: statsResult.validCount,
      invalidCount: statsResult.invalidCount,
      totalProcessed: statsResult.totalProcessed,
    },
  };
}


