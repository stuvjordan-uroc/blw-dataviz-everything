/**
 * API contract types for the polling system.
 * These types define the structure of data exchanged between clients and servers.
 * 
 * NOTE:  For types sent TO an api endpoint, use the 'Dto' suffix.
 * For types returned FROM an api endpoint, omit the 'Dto' suffix.
 */

import type { ViewMaps, SplitWithSegmentGroup, SplitWithSegmentGroupDiff, SegmentVizConfig, GridLabelsDisplay, ViewIdLookup } from './visualization';
import type { Question, QuestionWithDetails } from './index';

/**
 * ===============================
 * SHARED SESSION TYPES
 * ===============================
 */

/**
 * Session configuration for a polling session.
 * Defines which questions are presented to respondents and how responses are visualized.
 * 
 * This is the storage format - stores only Question keys, not full details.
 * Admin API uses this for creating sessions.
 * Public API expands Question[] to QuestionWithDetails[] when serving to clients.
 */
export interface SessionConfig {
  // Questions in the order they will be presented to respondents
  // Stored as keys only (varName, batteryName, subBattery)
  questionOrder: Question[];

  // One visualization per response question, with unique ID for reference
  visualizations: (SegmentVizConfig & { id: string })[];
}

/**
 * Pre-computed lookup maps for efficient response transformation.
 * Built at session creation to minimize response processing latency.
 * 
 * These maps are included in visualization data sent to clients and stored
 * in the database for efficient response processing.
 */
export interface VisualizationLookupMaps {
  // Maps response index to expanded response group index (O(1) lookup)
  // Example: {0: 0, 1: 0, 2: 1, 3: 1, 4: 2}
  responseIndexToGroupIndex: Record<number, number>;

  // Maps group profile signature to basis split index (O(1) lookup)
  // Key format: serialized profile like "0:1:null:2" where each position
  // corresponds to a grouping question's response group index (or null)
  profileToSplitIndex: Record<string, number>;
}

/**
 * Base session type returned from API endpoints.
 * Contains all session metadata and configuration.
 */
export interface Session {
  id: number;
  slug: string;
  isOpen: boolean;
  description: string | null;
  createdAt: Date | string;
  sessionConfig: SessionConfig | null;
}

/**
 * ===============================
 * ADMIN AUTH ENDPOINTS
 * ===============================
 */

/**
 * POST /admin/auth/login - Admin authentication
 */
export interface LoginResponse {
  accessToken: string;
  user: {
    id: number;
    email: string;
    name: string;
    isActive: boolean;
  };
}

/**
 * ===============================
 * ADMIN SESSION ENDPOINTS
 * ===============================
 */

/**
 * POST /sessions - Create a new session
 */
export interface CreateSessionDto {
  description: string | null;
  sessionConfig: {
    questionOrder: Question[];
    visualizations: Omit<SegmentVizConfig, 'id'>[]; // IDs are generated server-side
  };
  slug?: string; // Optional - will be generated if not provided
}

/**
 * GET /sessions - Get all sessions
 */
export interface GetAllSessionsResponse {
  sessions: Session[];
}

/**
 * GET /sessions/:id - Get session by ID
 * Returns: Session
 */

/**
 * DELETE /sessions/:id - Delete a session
 * Returns: void
 */

/**
 * PATCH /sessions/:id/toggle - Toggle session status
 */
export interface ToggleSessionStatusDto {
  isOpen: boolean;
}


/**
 * ========================================
 * PUBLIC SESSIONS ENDPOINTS
 * ========================================
 */

/**
 * Visualization data included in session responses
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
  gridLabels: Record<string, GridLabelsDisplay>; // Grid labels per viewId
  viewIdLookup: ViewIdLookup; // Map from active questions to viewId
  vizWidth: number; // Canvas width in abstract units
  vizHeight: number; // Canvas height in abstract units
}

/**
 * GET /sessions/:slug - Get session by slug
 * 
 * Contains all information needed to interact with a polling session:
 * - Session metadata and configuration
 * - Current visualization state with viewMaps
 * - API endpoints for submitting responses and streaming updates
 */
export interface SessionResponse {
  // Session metadata
  id: number;
  slug: string;
  isOpen: boolean;
  description: string | null;
  createdAt: Date | string;

  // Session configuration with full question details for client rendering
  config: Omit<SessionConfig, 'questionOrder'> & { questionOrder: QuestionWithDetails[] };

  // Current visualization state
  visualizations: VisualizationData[];

  // API endpoints
  endpoints: {
    submitResponse: string;
    visualizationStream: string;
  };
}

/**
 * =============================================
 * PUBLIC RESPONSES ENDPOINTS
 * =============================================
 */

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
 * POST /sessions/:slug/responses - Submit responses
 */
export interface SubmitResponsesDto {
  sessionId: number;
  answers: RespondentAnswer[];
}

/**
 * Response from submitting responses
 */
export interface SubmitResponsesResponse {
  respondentId: number;
}

/**
 * GET SESSION RESPONSES ENDPOINT
 */

//TODO

/**
 * GET SESSION STATS ENDPOINT
 */

//TODO


/**
 * ======================================
 * VISUALIZATION STREAM SERVICE
 * ======================================
 */

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
