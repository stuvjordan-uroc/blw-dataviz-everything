import React from "react";
import { SegmentGroupDisplay } from "../../VizStateManager/types";
import { SegmentGroupGridLabels } from "./SegmentGroupGridLabels";
import { SegmentGroupBoundaries } from "./SegmentGroupBoundaries";
import { Segments } from "./Segments";

/**
 * AnnotationLayer - Pure React component for rendering annotation overlays
 *
 * Renders absolutely positioned annotation components:
 * - SegmentGroupGridLabels: Row and column labels for the grid
 * - SegmentGroupBoundaries: Outer rectangles for segment groups (click-to-toggle)
 * - Segments: Inner segment boundaries and proportion labels (click-to-toggle)
 *
 * All positioning is relative to the canvas-container.
 * The margin offset positions annotations relative to the canvas.
 *
 * This is a pure React component - no manual DOM manipulation.
 * Each child component manages its own visibility state.
 */
export interface AnnotationLayerProps {
  /**
   * Segment groups with bounds and group definitions
   */
  segmentDisplay: SegmentGroupDisplay[];

  /**
   * Margin offset for positioning annotations relative to canvas
   */
  margin: { x: number; y: number };
}

export function AnnotationLayer({
  segmentDisplay,
  margin,
}: AnnotationLayerProps) {
  return (
    <>
      {/* Grid labels for rows and columns (always visible) */}
      <SegmentGroupGridLabels segmentDisplay={segmentDisplay} margin={margin} />

      {/* Segment group boundaries (click-to-toggle) */}
      <SegmentGroupBoundaries segmentDisplay={segmentDisplay} margin={margin} />

      {/* Segments: boundaries and proportion labels (click-to-toggle) */}
      <Segments segmentDisplay={segmentDisplay} margin={margin} />
    </>
  );
}
