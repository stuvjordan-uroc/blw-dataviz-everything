/**
 * API contract types for the polling system.
 * These types define the structure of data exchanged between clients and servers.
 */

import type { ViewMaps, SplitWithSegmentGroup, SplitWithSegmentGroupDiff, SegmentVizConfig } from './visualization';

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
  config: SegmentVizConfig;
  sequenceNumber: number;
  splits: SplitWithSegmentGroup[];
  basisSplitIndices: number[];
  lastUpdated: string | Date;
  viewMaps: ViewMaps; // Precomputed view mappings for efficient view switching
  vizWidth: number; // Canvas width in abstract units
  vizHeight: number; // Canvas height in abstract units
}

/**
 * Visualization snapshot event data
 * Sent immediately when client connects to stream
 */
export interface VisualizationSnapshotEvent {
  sessionId: number;
  isOpen: boolean;
  visualizations: VisualizationData[];
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
  splits: SplitWithSegmentGroup[];
  splitDiffs?: SplitWithSegmentGroupDiff[];
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
 * Used in response submission payloads.
 */
export interface RespondentAnswer {
  varName: string;
  batteryName: string;
  subBattery: string;
  responseIndex: number; // Index into the responses array from questions.questions
}

/**
 * Payload for submitting responses to a session
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
