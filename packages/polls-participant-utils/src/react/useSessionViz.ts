/**
 * React hook for consuming session visualization state.
 * 
 * This hook bridges SessionVizClient into React's component lifecycle,
 * providing a declarative API for React components to:
 * - Connect to a session on mount
 * - Track loading/error/session status (React state)
 * - Access SessionVizClient for canvas/D3 components to subscribe directly
 * - Clean up connections on unmount
 * 
 * Note: Visualization point positions are NOT stored in React state.
 * Canvas/D3 components should subscribe directly to client.subscribeToVizState()
 * to avoid unnecessary React re-renders.
 * 
 * Exports:
 * - useSessionViz(slug, apiBaseUrl): Main hook for visualization viewing
 * 
 * Usage example:
 * ```tsx
 * function VizViewerPage({ sessionSlug }: { sessionSlug: string }) {
 *   const {
 *     client,
 *     isLoading,
 *     error,
 *     sessionData,
 *     isSessionOpen,
 *   } = useSessionViz(sessionSlug, 'http://localhost:3005');
 * 
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!client) return null;
 * 
 *   // Pass client to canvas components for direct subscription
 *   return (
 *     <>
 *       {client.getVisualizationIds().map((vizId) => (
 *         <div key={vizId}>
 *           <VizCanvas vizId={vizId} client={client} />
 *           <ViewControls 
 *             onSwitchView={(viewId) => client.switchView(vizId, viewId)} 
 *           />
 *           <DisplayModeToggle 
 *             onChange={(mode) => client.setDisplayMode(vizId, mode)} 
 *           />
 *         </div>
 *       ))}
 *       <ResponseForm disabled={!isSessionOpen} />
 *     </>
 *   );
 * }
 * 
 * // Canvas component subscribes directly to avoid React re-renders
 * function VizCanvas({ vizId, client }: { vizId: string, client: SessionVizClient }) {
 *   const canvasRef = useRef<HTMLCanvasElement>(null);
 *   
 *   useEffect(() => {
 *     return client.subscribeToVizState((id, result) => {
 *       if (id === vizId) {
 *         drawToCanvas(canvasRef.current, result.endState, result.diff);
 *       }
 *     });
 *   }, [vizId, client]);
 *   
 *   return <canvas ref={canvasRef} />;
 * }
 * ```
 */

import { useState, useEffect, useMemo } from 'react';
import { PollsApiClient } from 'api-polls-client';
import type { SessionResponse } from 'api-polls-client';
import { SessionVizClient } from '../viz/SessionVizClient';
import type { ConnectionStatus } from '../viz/types';

export interface UseSessionVizResult {
  /** SessionVizClient instance for subscribing to viz updates and calling actions */
  client: SessionVizClient | null;

  /** True while initial connection is being established */
  isLoading: boolean;

  /** Error if connection or data fetch failed */
  error: Error | null;

  /** Session metadata and configuration */
  sessionData: SessionResponse | null;

  /** True if session is open (accepting responses), false if closed, null if unknown */
  isSessionOpen: boolean | null;

  /** Current SSE connection status */
  connectionStatus: ConnectionStatus;
}

/**
 * React hook for session visualization viewing.
 * 
 * @param slug - The session's unique slug
 * @param apiBaseUrl - Base URL of the polling API (e.g., 'http://localhost:3005')
 * @returns Object with client instance, loading state, error state, and session metadata
 */
export function useSessionViz(
  slug: string,
  apiBaseUrl: string
): UseSessionVizResult {
  // Create API client and SessionVizClient (stable across renders)
  const client = useMemo(() => {
    const apiClient = new PollsApiClient(apiBaseUrl);
    return new SessionVizClient(apiClient);
  }, [apiBaseUrl]);

  // React state for UI-relevant data only
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sessionData, setSessionData] = useState<SessionResponse | null>(null);
  const [isSessionOpen, setIsSessionOpen] = useState<boolean | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [clientReady, setClientReady] = useState(false);

  // Connect to session and set up subscriptions
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        // Connect to session
        await client.connect(slug);

        if (!mounted) return;

        // Get session metadata
        setSessionData(client.getSessionData());
        setIsSessionOpen(client.getSessionStatus());
        setClientReady(true);
        setIsLoading(false);

        // Subscribe to session status changes (affects React UI)
        const unsubscribeStatus = client.subscribeToSessionStatus((isOpen) => {
          setIsSessionOpen(isOpen);
        });

        // Subscribe to connection status changes (affects React UI)
        const unsubscribeConnection = client.subscribeToConnectionStatus((status) => {
          setConnectionStatus(status);
        });

        // Cleanup on unmount
        return () => {
          mounted = false;
          unsubscribeStatus();
          unsubscribeConnection();
          client.disconnect();
        };
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    }

    const cleanup = initialize();

    return () => {
      mounted = false;
      cleanup.then(fn => fn?.());
    };
  }, [client, slug]);

  return {
    client: clientReady ? client : null,
    isLoading,
    error,
    sessionData,
    isSessionOpen,
    connectionStatus,
  };
}
