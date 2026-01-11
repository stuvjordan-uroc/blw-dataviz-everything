import React, { useEffect, useRef } from "react";

/**
 * VizCanvasMount - Minimal component for manually attaching canvas to DOM
 *
 * This is the ONLY component that performs manual DOM manipulation.
 * It appends the pre-created canvas element (from useVizCanvas) to a
 * React-rendered div at position (0, 0) within the container.
 *
 * The canvas element itself is created and managed by VizStateManager
 * outside of React's rendering cycle.
 *
 * @param canvasElement - HTMLCanvasElement created by useVizCanvas
 */
export interface VizCanvasMountProps {
  canvasElement: HTMLCanvasElement | null;
}

export function VizCanvasMount({ canvasElement }: VizCanvasMountProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canvasElement && containerRef.current) {
      // Manually append canvas to React-rendered container
      containerRef.current.appendChild(canvasElement);

      // Cleanup: remove canvas when component unmounts
      return () => {
        canvasElement.remove();
      };
    }
  }, [canvasElement]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
      }}
    />
  );
}
