import type { ViewMaps } from 'shared-computation';

/**
 * EVERYTHING HERE IS A PLACEHOLDER.
 * 
 * this package is not done until we're importing these types
 * from api-polls-public or from a client-types package.
 */


/**
 * Session response from GET /sessions/:slug
 * 
 * Contains all information needed to interact with a polling session.
 */
export interface SessionResponse {
  // Session metadata
  id: number;
  slug: string;
  isOpen: boolean;
  description: string | null;
  createdAt: Date | string;

  // Session configuration
  config: any; // TODO: Type this properly after prototyping

  // Current visualization state
  visualizations: VisualizationData[];

  // API endpoints
  endpoints: {
    submitResponse: string;
    visualizationStream: string;
  };
}

/**
 * Visualization data from GET /sessions/:slug
 * Includes viewMaps for O(1) view switching
 */
export interface VisualizationData {
  visualizationId: string;
  config: any; // TODO: Type as SegmentVizConfig
  sequenceNumber: number;
  splits: any[]; // TODO: Type as SplitWithSegmentGroup[]
  basisSplitIndices: number[];
  lastUpdated: string | Date;
  viewMaps: ViewMaps; // Precomputed view mappings for efficient view switching
}

/**
 * Visualization snapshot event data
 * Sent immediately when client connects to stream
 */
export interface VisualizationSnapshotEvent {
  sessionId: number;
  isOpen: boolean;
  visualizations: any[]; // TODO: Type this properly
  timestamp: string | Date;
}

/**
 * Visualization update event data
 * Sent when responses are processed and visualization changes
 */
export interface VisualizationUpdateEvent {
  visualizationId: string;
  fromSequence: number;
  toSequence: number;
  splits: any[]; // TODO: Type as SplitWithSegmentGroup[]
  splitDiffs: any[]; // TODO: Type as SplitWithSegmentGroupDiff[]
  basisSplitIndices: number[];
  timestamp: string | Date;
}

/**
 * Session status change event data
 * Sent when admin opens/closes a session
 */
export interface SessionStatusChangedEvent {
  isOpen: boolean;
  timestamp: string | Date;
}

/**
 * A respondent's answer to a single question
 * 
 * Matches the RespondentAnswer interface from the backend.
 */
export interface RespondentAnswer {
  varName: string;
  batteryName: string;
  subBattery: string;
  responseIndex: number; // Index into the responses array from questions.questions
}

/**
 * Payload for submitting responses to a session
 * 
 * Matches the SubmitResponsesDto interface from the backend.
 */
export interface SubmitResponsesDto {
  sessionId: number;
  answers: RespondentAnswer[];
}

/**
 * Response from submitting answers
 */
export interface SubmitResponsesResponse {
  respondentId: number;
}
