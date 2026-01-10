import React, { useEffect, useRef, useState } from "react";
import { VizStateManager } from "../../VizStateManager";
import { VizRenderConfig } from "../../types";

/**
 * VizCanvas - A minimal React component that manages canvas lifecycle and VizStateManager attachment
 *
 * This component focuses solely on:
 * 1. Rendering a canvas element
 * 2. Attaching the canvas to a VizStateManager on mount
 * 3. Detaching the canvas on unmount
 * 4. Updating canvas width when the width prop changes
 *
 * It does NOT handle:
 * - Width responsiveness (parent controls width)
 * - Segment boundaries or labels (see VizCanvasWithAnnotations)
 * - User controls for viewId/displayMode (see ControllableViz)
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   const width = useContainerWidth(containerRef);
 *   const { vizRefs } = useSessionViz(apiUrl, sessionSlug);
 *   const vizManager = vizRefs.get('viz-id')?.vizManager;
 *
 *   if (!vizManager) return <div>Loading...</div>;
 *
 *   return (
 *     <div ref={containerRef}>
 *       <VizCanvas
 *         vizManager={vizManager}
 *         width={width}
 *         initialConfig={{
 *           initialCanvasWidth: width,
 *           initialDisplayMode: 'expanded',
 *           initialViewId: '',
 *           animation: { appearDuration: 200 },
 *           margin: { x: 20, y: 20 }
 *         }}
 *         onAttached={({ canvasId }) => console.log('Attached:', canvasId)}
 *       />
 *     </div>
 *   );
 * };
 * ```
 */

export interface VizCanvasProps {
  /**
   * VizStateManager instance to attach the canvas to.
   * Should be a stable reference (e.g., from useSessionViz's vizRefs).
   */
  vizManager: VizStateManager;

  /**
   * Canvas width in pixels.
   * Parent component controls this value (e.g., from useContainerWidth hook).
   * When this changes, setCanvasWidth will be called automatically.
   */
  width: number;

  /**
   * Initial configuration for the canvas.
   * Used when attachCanvas is called.
   *
   * IMPORTANT: This should be a stable reference (memoize with useMemo if computed).
   * Changes to this object will trigger canvas re-attachment, which is expensive.
   */
  initialConfig: VizRenderConfig;

  /**
   * Optional callback invoked after canvas is successfully attached.
   * Receives the canvasId and detach function.
   * Useful for parent components that need to call VizStateManager methods directly.
   */
  onAttached?: (result: { canvasId: number; detach: () => void }) => void;
}

export function VizCanvas({
  vizManager,
  width,
  initialConfig,
  onAttached,
}: VizCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasId, setCanvasId] = useState<number | null>(null);

  // Store the latest onAttached callback in a ref to avoid re-attachment when it changes
  const onAttachedRef = useRef(onAttached);
  useEffect(() => {
    onAttachedRef.current = onAttached;
  }, [onAttached]);

  // Attach canvas on mount, detach on unmount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn("[VizCanvas] Canvas ref is null, cannot attach");
      return;
    }

    let attachmentResult: { canvasId: number; detachCanvas: () => void };

    try {
      attachmentResult = vizManager.attachCanvas(canvas, initialConfig);
      setCanvasId(attachmentResult.canvasId);

      // Notify parent of successful attachment
      // Map detachCanvas to detach for consistency with prop interface
      onAttachedRef.current?.({
        canvasId: attachmentResult.canvasId,
        detach: attachmentResult.detachCanvas,
      });
    } catch (error) {
      console.error(
        "[VizCanvas] Failed to attach canvas to VizStateManager:",
        error instanceof Error ? error.message : String(error)
      );
      return;
    }

    // Cleanup: detach canvas when component unmounts or when re-attaching
    return () => {
      try {
        attachmentResult.detachCanvas();
        setCanvasId(null);
      } catch (error) {
        console.error(
          "[VizCanvas] Error during canvas detachment:",
          error instanceof Error ? error.message : String(error)
        );
      }
    };
  }, [vizManager, initialConfig]);

  // Update canvas width when width prop changes
  useEffect(() => {
    if (canvasId === null) {
      // Canvas not yet attached, width will be set during initial attachment
      return;
    }

    if (!Number.isFinite(width) || width <= 0) {
      console.warn(`[VizCanvas] Invalid width: ${width}, skipping update`);
      return;
    }

    try {
      vizManager.setCanvasWidth(canvasId, width);
    } catch (error) {
      console.error(
        "[VizCanvas] Failed to update canvas width:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }, [vizManager, canvasId, width]);

  return <canvas ref={canvasRef} />;
}
