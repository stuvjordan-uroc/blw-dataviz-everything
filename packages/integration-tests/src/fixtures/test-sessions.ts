import type { InferInsertModel } from "drizzle-orm";
import { sessions, pollQuestions, sessionVisualizations } from "shared-schemas";
import type { SessionConfig } from "shared-schemas";
import { testQuestions } from "./test-questions";
import { validSessionConfig } from "./test-session-configs";

type SessionInsert = InferInsertModel<typeof sessions>;
type PollQuestionInsert = InferInsertModel<typeof pollQuestions>;
type SessionVisualizationInsert = InferInsertModel<typeof sessionVisualizations>;

// Add IDs to the visualization configs for existing sessions
const validSessionConfigWithIds: SessionConfig = {
  ...validSessionConfig,
  visualizations: validSessionConfig.visualizations.map((viz, idx) => ({
    ...viz,
    id: `viz-${idx + 1}`,
  })),
};

/**
 * An existing open session fixture
 * Represents a session that has already been created via the API
 */
export const existingOpenSession: SessionInsert = {
  slug: "test-open-session",
  description: "Test session for status toggle tests",
  sessionConfig: validSessionConfigWithIds,
  isOpen: true,
};

/**
 * An existing closed session fixture
 * Useful for testing transitions from closed to open
 */
export const existingClosedSession: SessionInsert = {
  slug: "test-closed-session",
  description: "Test session that is closed",
  sessionConfig: validSessionConfigWithIds,
  isOpen: false,
};

/**
 * Poll questions for the existing open session
 * These correspond to the questions in validSessionConfig.questionOrder
 * 
 * Note: sessionId will be set when inserted into the database
 */
export const existingSessionPollQuestions: Omit<PollQuestionInsert, "sessionId">[] =
  validSessionConfig.questionOrder.map((q, index) => ({
    varName: q.varName,
    batteryName: q.batteryName,
    subBattery: q.subBattery,
    orderingIndex: index,
  }));

/**
 * Session visualization for the existing open session
 * This represents the initialized visualization with splits and lookup maps
 * 
 * Note: sessionId will be set when inserted into the database
 * Note: The actual splits, basisSplitIndices, and lookupMaps would be generated
 * by the session creation logic. For fixture purposes, we use minimal valid data.
 */
export const existingSessionVisualization: Omit<SessionVisualizationInsert, "sessionId"> = {
  visualizationId: "viz_testopen",
  basisSplitIndices: [0],
  splits: [
    {
      basisSplitIndices: [0],
      groups: [],
      totalWeight: 0,
      totalCount: 0,
      segmentGroupBounds: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
      points: [],
      responseGroups: {
        collapsed: validSessionConfig.visualizations[0].responseQuestion.responseGroups.collapsed.map((rg) => ({
          label: rg.label,
          values: rg.values,
          totalCount: 0,
          totalWeight: 0,
          proportion: 0,
          bounds: { x: 0, y: 0, width: 0, height: 0 },
          pointPositions: [],
        })),
        expanded: validSessionConfig.visualizations[0].responseQuestion.responseGroups.expanded.map((rg) => ({
          label: rg.label,
          values: rg.values,
          totalCount: 0,
          totalWeight: 0,
          proportion: 0,
          bounds: { x: 0, y: 0, width: 0, height: 0 },
          pointPositions: [],
        })),
      },
    },
  ],
  lookupMaps: {
    responseIndexToGroupIndex: {},
    profileToSplitIndex: { "0:0": 0 },
  },
};
