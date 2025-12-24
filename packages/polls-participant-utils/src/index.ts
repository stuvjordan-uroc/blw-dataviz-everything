/**
 * Main entry point for polls-participant-utils package.
 * 
 * Exports all public APIs for participant-side polling session interaction.
 */

// Visualization viewing
export { VizStateManager } from './viz/VizStateManager';
export { SessionVizClient } from './viz/SessionVizClient';
export * from './viz/viewComputation';

// Types
export type {
  ViewState,
  ServerState,
  ParticipantPointPosition,
  ParticipantVisibleState,
  ParticipantVisibleDiff,
  StateChangeResult,
  StateChangeCallback,
  SplitWithSegmentGroup,
  Point,
  ViewMaps,
  SplitWithSegmentGroupDiff,
} from './viz/types';

// React hooks
export { useSessionViz } from './react/useSessionViz';
export type { UseSessionVizResult } from './react/useSessionViz';
export { useResponseForm } from './react/useResponseForm';

// Response submission utilities (future)
// export * from './responses';
