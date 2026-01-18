import React, { useEffect, useRef, useState } from "react";
import { VizStateManager } from "../../VizStateManager";
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
}

export function SingleSplitViz({
  vizManager,
  vizRenderConfig,
  annotationMargin,
  splitToFocus,
}: SingleSplitVizProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

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

    // Read canvas dimensions after attachment (attachSingleSplitCanvas sets them)
    setCanvasDimensions({
      width: canvas.width,
      height: canvas.height,
    });

    // Cleanup: detach the canvas when component unmounts or dependencies change
    return () => {
      detachSingleSplitCanvas();
      canvasRef.current = null;
      setCanvasDimensions(null);
    };
  }, [vizManager, vizRenderConfig, splitToFocus]);

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
