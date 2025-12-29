/**
 * React hook for fully encapsulated session visualization setup.
 * 
 * This hook provides a complete, batteries-included solution for displaying
 * session visualizations. It internally:
 * - Creates and manages a SessionVizClient
 * - Fetches session data and connects to live updates
 * - Creates canvas elements for each visualization
 * - Instantiates VizRenderer for each canvas (with animations already running)
 * - Returns everything needed for the UI to display and control visualizations
 * 
 * The returned canvases are detached from the DOM - the caller just needs to
 * attach them wherever they want in the component tree.
 * 
 * @example
 * const { client, sessionData, renderers, isLoading, error } = useSessionViz({
 *   slug: 'my-session',
 *   apiBaseUrl: 'http://localhost:3005',
 *   canvasWidth: 600,
 *   getImageKey: (point) => getLabel(point),
 *   images: imageMap,
 * });
 * 
 * // In render: attach canvases to DOM
 * renderers.map(renderer => (
 *   containerRef.current.appendChild(renderer.canvas)
 * ));
 * 
 * // Control visualizations via client
 * client.switchView(vizId, viewId);
 * client.setDisplayMode(vizId, 'collapsed');
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import { PollsApiClient } from 'api-polls-client';
import type { SessionResponse, VisualizationData } from 'shared-types';
import { SessionVizClient } from '../viz/SessionVizClient';
import { VizRenderer } from '../viz/VizRenderer';
import type { VizRendererConfig } from '../viz/types';

/**
 * Configuration for the useSessionViz hook.
 * Combines SessionVizClient config with VizRenderer config.
 */
export interface UseSessionVizConfig {
  /** Session slug to connect to */
  slug: string;

  /** Base URL of the polling API (e.g., 'http://localhost:3005') */
  apiBaseUrl: string;

  /** Canvas width in pixels for all visualizations */
  canvasWidth: number;

  /** Optional animation configuration (passed to VizRenderer) */
  animation?: VizRendererConfig['animation'];

  /**
   * Image configuration - must provide EITHER:
   * - getImage: Direct function to get image for a point
   * - getImageKey + images: Key-based lookup (preferred)
   */
  getImage?: VizRendererConfig['getImage'];
  getImageKey?: VizRendererConfig['getImageKey'];
  images?: VizRendererConfig['images'];
}

/**
 * Renderer object for a single visualization.
 * Contains the canvas element and metadata.
 */
export interface VizRendererInfo {
  /** Unique ID for this visualization */
  visualizationId: string;

  /** Canvas element (detached, ready to append to DOM) */
  canvas: HTMLCanvasElement;

  /** Full visualization metadata from server */
  data: VisualizationData;
}

/**
 * Return value from useSessionViz hook.
 */
export interface UseSessionVizResult {
  /** SessionVizClient instance for controlling visualizations */
  client: SessionVizClient | null;

  /** Full session metadata and configuration */
  sessionData: SessionResponse | null;

  /** Array of renderer objects (canvases + metadata) */
  renderers: VizRendererInfo[];

  /** True while initial connection is being established */
  isLoading: boolean;

  /** Error if connection or setup failed */
  error: Error | null;
}

/**
 * Fully encapsulated hook for session visualization viewing.
 * 
 * Creates SessionVizClient, canvases, and VizRenderers internally.
 * Returns detached canvases ready to attach to DOM wherever needed.
 * 
 * @param config - Configuration including session slug, API URL, and rendering options
 * @returns Object with client, session data, renderers, loading state, and errors
 */
export function useSessionViz(config: UseSessionVizConfig): UseSessionVizResult {
  const { slug, apiBaseUrl, canvasWidth, animation, getImage, getImageKey, images } = config;

  // Create API client and SessionVizClient (stable across renders)
  const client = useMemo(() => {
    const apiClient = new PollsApiClient(apiBaseUrl);
    return new SessionVizClient(apiClient);
  }, [apiBaseUrl]);

  // React state for UI-relevant data
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sessionData, setSessionData] = useState<SessionResponse | null>(null);
  const [renderers, setRenderers] = useState<VizRendererInfo[]>([]);

  // Track VizRenderer instances for cleanup
  const vizRenderersRef = useRef<VizRenderer[]>([]);

  // Connect to session and create renderers
  useEffect(() => {
    let mounted = true;

    // Cleanup function
    const cleanup = () => {
      // Destroy all VizRenderers
      vizRenderersRef.current.forEach(renderer => renderer.destroy());
      vizRenderersRef.current = [];
    };

    async function connect() {
      try {
        setIsLoading(true);
        setError(null);

        // Connect to session
        await client.connect(slug);

        if (!mounted) {
          cleanup();
          return;
        }

        // Get session data
        const data = client.getSessionData();
        if (!data) {
          throw new Error('Failed to get session data after connecting');
        }

        setSessionData(data);

        // Create canvas and VizRenderer for each visualization
        const rendererInfos: VizRendererInfo[] = [];
        const vizRendererInstances: VizRenderer[] = [];

        for (const vizData of data.visualizations) {
          // Create detached canvas
          const canvas = document.createElement('canvas');

          // Create VizRenderer (starts rendering immediately on detached canvas)
          const renderer = new VizRenderer({
            canvas,
            visualizationId: vizData.visualizationId,
            client,
            canvasWidth,
            animation,
            getImage,
            getImageKey,
            images,
          });

          vizRendererInstances.push(renderer);

          rendererInfos.push({
            visualizationId: vizData.visualizationId,
            canvas,
            data: vizData,
          });
        }

        if (!mounted) {
          // Component unmounted during setup - clean up
          vizRendererInstances.forEach(r => r.destroy());
          return;
        }

        // Store instances for cleanup
        vizRenderersRef.current = vizRendererInstances;

        // Update state
        setRenderers(rendererInfos);
        setIsLoading(false);

      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    connect();

    // Cleanup on unmount or slug change
    return () => {
      mounted = false;
      cleanup();
      client.disconnect();
    };
  }, [slug, client, canvasWidth, animation, getImage, getImageKey, images]);

  return {
    client: isLoading ? null : client,
    sessionData,
    renderers,
    isLoading,
    error,
  };
}
