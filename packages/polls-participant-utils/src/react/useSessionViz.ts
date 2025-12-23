/**
 * React hook for consuming session visualization state.
 * 
 * This hook bridges SessionVizClient into React's component lifecycle,
 * providing a declarative API for React components to:
 * - Connect to a session on mount
 * - Receive state updates and trigger re-renders
 * - Access participant actions (switchView, setDisplayMode)
 * - Clean up connections on unmount
 * 
 * Exports:
 * - useSessionViz(slug, apiBaseUrl): Main hook for visualization viewing
 * 
 * Usage example:
 * ```tsx
 * function VizViewerPage({ sessionSlug }: { sessionSlug: string }) {
 *   const {
 *     vizState,
 *     vizDiff,
 *     isLoading,
 *     error,
 *     sessionData,
 *     switchView,
 *     setDisplayMode
 *   } = useSessionViz(sessionSlug, 'http://localhost:3005');
 * 
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!vizState) return null;
 * 
 *   return (
 *     <>
 *       <VizCanvas points={vizState.points} diff={vizDiff} />
 *       <ViewControls onSwitchView={switchView} />
 *       <DisplayModeToggle onChange={setDisplayMode} />
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
  /** Current visible state for rendering, or null if not yet loaded */
  vizState: ParticipantVisibleState | null;

  /** Most recent diff (for animation), or null if no recent change */
  vizDiff: ParticipantVisibleDiff | null;

  /** True while initial connection is being established */
  isLoading: boolean;

  /** Error if connection or data fetch failed */
  error: Error | null;

  /** Session metadata and configuration */
  sessionData: SessionResponse | null;

  /** Change which questions are active in the view */
  switchView: (viewId: string) => void;

  /** Toggle between collapsed and expanded display modes */
  setDisplayMode: (mode: 'collapsed' | 'expanded') => void;
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
  // 2. Set up state for vizState, vizDiff, isLoading, error
  // 3. useEffect to connect on mount and disconnect on unmount
  // 4. Subscribe to client updates and update React state
  // 5. Wrap action methods (switchView, setDisplayMode) in useCallback

  const [vizState, setVizState] = useState<ParticipantVisibleState | null>(null);
  const [vizDiff, setVizDiff] = useState<ParticipantVisibleDiff | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sessionData, setSessionData] = useState<SessionResponse | null>(null);

  // Placeholder implementations
  const switchView = useCallback((viewId: string) => {
    // TODO: Implement
  }, []);

  const setDisplayMode = useCallback((mode: 'collapsed' | 'expanded') => {
    // TODO: Implement
  }, []);

  return {
    vizState,
    vizDiff,
    isLoading,
    error,
    sessionData,
    switchView,
    setDisplayMode,
  };
}
