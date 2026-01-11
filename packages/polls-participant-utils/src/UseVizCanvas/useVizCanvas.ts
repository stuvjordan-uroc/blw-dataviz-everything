import { useEffect, useRef, useState } from 'react';
import { VizStateManager } from '../VizStateManager';
import { VizRenderConfig } from '../types';
import { VizLogicalState, StateChangeOrigin } from '../VizStateManager/types';

/**
 * Custom hook that manages canvas lifecycle and VizStateManager integration
 * 
 * This hook:
 * - Creates an unattached canvas element
 * - Attaches it to VizStateManager
 * - Subscribes to state updates
 * - Handles canvas width changes
 * - Allows caller to hook into viz state changes by passing onStateChange callback.
 * 
 * The canvas element is created off-DOM and can be mounted by child components.
 * All VizStateManager interaction is centralized in this hook.
 * 
 * @param vizManager - VizStateManager instance from useSessionViz
 * @param config - Initial configuration for the canvas
 * @param width - Desired canvas width (triggers setCanvasWidth when changed)
 * @param onStateChange - Optional callback invoked on every state change
 * 
 * @returns Object containing:
 *   - canvasElement: The HTMLCanvasElement (initially null, then available)
 *   - canvasId: The ID for this canvas in VizStateManager
 *   - canvasDimensions: Actual canvas dimensions { width, height }
 * 
 * @example
 * ```tsx
 * function ControllableViz({ vizManager, width }) {
 *   const { canvasElement, canvasId, vizState, canvasDimensions } = useVizCanvas(
 *     vizManager,
 *     {
 *       initialCanvasWidth: width,
 *       initialDisplayMode: 'expanded',
 *       initialViewId: '',
 *       animation: { appearDuration: 200 },
 *       margin: { x: 20, y: 20 }
 *     },
 *     width
 *   );
 *   
 *   // canvasElement can be mounted by VizCanvas
 *   // vizState.segmentDisplay used for annotations
 *   // canvasDimensions used for container sizing
 * }
 * ```
 */
export function useVizCanvas(
  vizManager: VizStateManager,
  config: VizRenderConfig,
  width: number,
  onStateChange?: (state: VizLogicalState, origin: StateChangeOrigin) => void
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasIdRef = useRef<number | null>(null);

  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0
  });

  // Create canvas and attach to VizStateManager
  useEffect(() => {
    // Create unattached canvas element
    const canvas = document.createElement('canvas');

    // Attach to VizStateManager
    const { canvasId, detachCanvas } = vizManager.attachCanvas(canvas, config);

    // Subscribe to state updates
    const unsubscribe = vizManager.subscribeToStateUpdate(canvasId, (state, origin) => {
      // Invoke optional callback on every state change
      onStateChange?.(state, origin);

      // Optimize re-renders based on origin:
      // - "canvas" origin: only dimensions changed
      // - Other origins: state changed (segmentDisplay, viewId, displayMode)
      // We only track dimensions in component state

      if (origin === 'canvas' || origin === 'subscription') {
        // Canvas dimensions changed or initial subscription - read from canvas element
        setCanvasDimensions({
          width: canvas.width,
          height: canvas.height
        });
      }
    });

    // Store refs
    canvasRef.current = canvas;
    canvasIdRef.current = canvasId;

    // Cleanup on unmount
    return () => {
      unsubscribe?.();
      detachCanvas();
      canvasRef.current = null;
      canvasIdRef.current = null;
    };
  }, [vizManager, config]);

  // Handle width changes
  useEffect(() => {
    if (canvasIdRef.current !== null && width > 0) {
      vizManager.setCanvasWidth(canvasIdRef.current, width);
    }
  }, [width, vizManager]);

  return {
    canvasElement: canvasRef.current,
    canvasId: canvasIdRef.current,
    canvasDimensions
  };
}
