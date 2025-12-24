/**
 * React hook for consuming session visualization state.
 * 
 * This hook bridges SessionVizClient into React's component lifecycle,
 * providing a declarative API for React components to:
 * - Connect to a session on mount
 * - Receive state updates for all visualizations and trigger re-renders
 * - Access participant actions (switchView, setDisplayMode) for specific visualizations
 * - Clean up connections on unmount
 * 
 * Exports:
 * - useSessionViz(slug, apiBaseUrl): Main hook for visualization viewing
 * 
 * Usage example:
 * ```tsx
 * function VizViewerPage({ sessionSlug }: { sessionSlug: string }) {
 *   const {
 *     vizStates,
 *     vizDiffs,
 *     isLoading,
 *     error,
 *     sessionData,
 *     switchView,
 *     setDisplayMode
 *   } = useSessionViz(sessionSlug, 'http://localhost:3005');
 * 
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!vizStates) return null;
 * 
 *   // Render each visualization separately
 *   return (
 *     <>
 *       {Array.from(vizStates.entries()).map(([vizId, vizState]) => (
 *         <div key={vizId}>
 *           <VizCanvas points={vizState.points} diff={vizDiffs?.get(vizId)} />
 *           <ViewControls onSwitchView={(viewId) => switchView(vizId, viewId)} />
 *           <DisplayModeToggle onChange={(mode) => setDisplayMode(vizId, mode)} />
 *         </div>
 *       ))}
 *     </>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { PollsApiClient } from 'api-polls-client';
import type { SessionResponse } from 'api-polls-client';
import { SessionVizClient } from '../viz/SessionVizClient';
import type {
  ParticipantVisibleState,
  ParticipantVisibleDiff,
} from '../viz/types';

export interface UseSessionVizResult {
  /** Current visible states for all visualizations, keyed by visualizationId, or null if not yet loaded */
  vizStates: Map<string, ParticipantVisibleState> | null;

  /** Most recent diffs for all visualizations (for animation), keyed by visualizationId, or null if no recent changes */
  vizDiffs: Map<string, ParticipantVisibleDiff> | null;

  /** True while initial connection is being established */
  isLoading: boolean;

  /** Error if connection or data fetch failed */
  error: Error | null;

  /** Session metadata and configuration */
  sessionData: SessionResponse | null;

  /** Change which questions are active in the view for a specific visualization */
  switchView: (visualizationId: string, viewId: string) => void;

  /** Toggle between collapsed and expanded display modes for a specific visualization */
  setDisplayMode: (visualizationId: string, mode: 'collapsed' | 'expanded') => void;
}

/**
 * React hook for session visualization viewing.
 * 
 * @param slug - The session's unique slug
 * @param apiBaseUrl - Base URL of the polling API (e.g., 'http://localhost:3005')
 * @returns Object with viz state, loading state, error state, and action handlers
 */
export function useSessionViz(
  slug: string,
  apiBaseUrl: string
): UseSessionVizResult {
  // TODO: Implement hook logic
  // 1. Create SessionVizClient instance (useMemo or useState)
  // 2. Set up state for vizStates (Map), vizDiffs (Map), isLoading, error
  // 3. useEffect to connect on mount and disconnect on unmount
  // 4. Subscribe to client updates and update React state:
  //    - On callback(visualizationId, state, diff):
  //      - Update vizStates Map with new state for visualizationId
  //      - Update vizDiffs Map with new diff for visualizationId
  // 5. Wrap action methods (switchView, setDisplayMode) in useCallback

  const [vizStates, setVizStates] = useState<Map<string, ParticipantVisibleState> | null>(null);
  const [vizDiffs, setVizDiffs] = useState<Map<string, ParticipantVisibleDiff> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sessionData, setSessionData] = useState<SessionResponse | null>(null);

  // Placeholder implementations
  const switchView = useCallback((visualizationId: string, viewId: string) => {
    // TODO: Implement
  }, []);

  const setDisplayMode = useCallback((visualizationId: string, mode: 'collapsed' | 'expanded') => {
    // TODO: Implement
  }, []);

  return {
    vizStates,
    vizDiffs,
    isLoading,
    error,
    sessionData,
    switchView,
    setDisplayMode,
  };
}
