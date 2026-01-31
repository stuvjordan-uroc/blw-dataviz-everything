import { useEffect, useRef, useState } from "react";
import { VizStateManager } from "../../VizStateManager";
import { SingleSplitCanvas } from "../../VizStateManager/SingleSplitCanvas";
import { VizRenderConfig } from "../../types";
import { Question, ResponseGroup } from "shared-types";
import { VizCanvasMount } from "../FullViz/VizCanvasMount";

export interface SingleSplitVizProps {
  /**
   * VizStateManager instance from useSessionViz
   */
  vizManager: VizStateManager;

  /**
   * Configuration for canvas rendering (width, display mode, view, animations, internal padding)
   */
  vizRenderConfig: Omit<VizRenderConfig, "initialViewId">;

  /**
   * External margin around canvas for rendering annotation labels
   * This is space OUTSIDE the canvas, not the internal canvas padding in vizRenderConfig.margin
   */
  annotationMargin: { x: number; y: number };

  /**
   * single split to focus on in this viz
   */
  splitToFocus:
    | number
    | Array<{
        question: Question;
        responseGroup: ResponseGroup | null;
      }>;

  /**
   * Optional canvas width in pixels. When this prop changes, the canvas will
   * efficiently resize without remounting, preserving animations and state.
   * If not provided, uses vizRenderConfig.initialCanvasWidth.
   */
  canvasWidth?: number;
}

export function SingleSplitViz({
  vizManager,
  vizRenderConfig,
  annotationMargin,
  splitToFocus,
  canvasWidth,
}: SingleSplitVizProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const managerRef = useRef<SingleSplitCanvas | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Effect 1: Create and attach canvas (runs once or when core dependencies change)
  useEffect(() => {
    // Create the canvas element (not attached to DOM)
    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;

    // Attach the canvas to the VizStateManager
    const result = vizManager.attachSingleSplitCanvas(
      canvas,
      vizRenderConfig,
      splitToFocus,
    );

    // If attachment failed (splitToFocus didn't match any splits), bail out
    if (!result) {
      console.warn(
        "Failed to attach single split canvas - splitToFocus did not match any splits",
      );
      canvas.remove();
      canvasRef.current = null;
      return;
    }

    const { singleSplitCanvasManager, detachSingleSplitCanvas } = result;

    // Store the manager in a ref so we can call methods on it later
    managerRef.current = singleSplitCanvasManager;

    // Read canvas dimensions after attachment (attachSingleSplitCanvas sets them)
    setCanvasDimensions({
      width: canvas.width,
      height: canvas.height,
    });

    // Cleanup: detach the canvas when component unmounts or dependencies change
    return () => {
      detachSingleSplitCanvas();
      canvasRef.current = null;
      managerRef.current = null;
      setCanvasDimensions(null);
    };
  }, [vizManager, vizRenderConfig, splitToFocus]);

  // Effect 2: Handle canvas width changes (resize existing canvas without remounting)
  useEffect(() => {
    if (canvasWidth !== undefined && managerRef.current && canvasRef.current) {
      // Call setCanvasWidth on the existing manager
      managerRef.current.setCanvasWidth(canvasWidth);

      // Update dimensions state to resize the wrapper div
      setCanvasDimensions({
        width: canvasRef.current.width,
        height: canvasRef.current.height,
      });
    }
  }, [canvasWidth]);

  return (
    <div
      style={{
        position: "relative",
        width: canvasDimensions
          ? canvasDimensions.width + 2 * annotationMargin.x
          : 0,
        height: canvasDimensions
          ? canvasDimensions.height + 2 * annotationMargin.y
          : 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: annotationMargin.x,
          top: annotationMargin.y,
        }}
      >
        <VizCanvasMount canvasElement={canvasRef.current} />
      </div>
    </div>
  );
}
