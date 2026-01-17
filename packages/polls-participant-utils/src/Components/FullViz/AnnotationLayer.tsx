import React from "react";
import type { SegmentGroupDisplay } from "../../VizStateManager/types";
import type { GridLabelsDisplay } from "shared-types";
import { GridLabels } from "./GridLabels";
import { SegmentGroupBoundaries } from "./SegmentGroupBoundaries";
import { Segments } from "./Segments";

/**
 * Default label component - joins labels with " · " separator
 */
function DefaultLabel({ labels }: { labels: string[] }) {
  return <>{labels.join(" · ")}</>;
}

/**
 * Default proportion label - displays percentage with 1 decimal place
 */
function DefaultProportionLabel({ proportion }: { proportion: number }) {
  return <>{(proportion * 100).toFixed(1)}%</>;
}

/**
 * AnnotationLayer - Pure React component for rendering annotation overlays
 *
 * Renders absolutely positioned annotation components:
 * - Grid labels: Row and column labels for the segment group grid
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
   * Pre-computed grid labels with geometry
   */
  gridLabelsDisplay: GridLabelsDisplay;

  /**
   * Annotation margin offset for positioning annotations relative to canvas
   */
  annotationMargin: { x: number; y: number };
}

export function AnnotationLayer({
  segmentDisplay,
  gridLabelsDisplay,
  annotationMargin,
}: AnnotationLayerProps) {
  return (
    <>
      {/* Grid labels for columns and rows */}
      <GridLabels
        gridLabelsDisplay={gridLabelsDisplay}
        annotationMargin={annotationMargin}
        ColumnLabel={DefaultLabel}
        RowLabel={DefaultLabel}
      />

      {/* Segment group boundaries (click-to-toggle) */}
      <SegmentGroupBoundaries
        segmentDisplay={segmentDisplay}
        margin={annotationMargin}
      />

      {/* Segments: boundaries and proportion labels (click-to-toggle) */}
      <Segments
        segmentDisplay={segmentDisplay}
        annotationMargin={annotationMargin}
        ProportionLabel={DefaultProportionLabel}
      />
    </>
  );
}
