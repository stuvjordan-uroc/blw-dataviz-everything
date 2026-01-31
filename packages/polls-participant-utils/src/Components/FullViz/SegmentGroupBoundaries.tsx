import { useState } from "react";
import { SegmentGroupDisplay } from "../../VizStateManager/types";

/**
 * SegmentGroupBoundaries - Renders outer boundaries for segment groups
 *
 * Each segment group (split) can have its boundary toggled by clicking.
 * Boundaries start hidden and can be toggled visible.
 *
 * CSS Classes (for custom styling):
 * - .segment-group-boundary: All segment group boundaries
 * - .segment-group-boundary--visible: Added when boundary is toggled visible
 */
export interface SegmentGroupBoundariesProps {
  segmentDisplay: SegmentGroupDisplay[];
  margin: { x: number; y: number };
}

export function SegmentGroupBoundaries({
  segmentDisplay,
  margin,
}: SegmentGroupBoundariesProps) {
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

  const toggleBoundary = (index: number) => {
    const newVisible = new Set(visibleIndices);
    if (newVisible.has(index)) {
      newVisible.delete(index);
    } else {
      newVisible.add(index);
    }
    setVisibleIndices(newVisible);
  };

  return (
    <>
      {segmentDisplay.map((split, index) => {
        const isVisible = visibleIndices.has(index);

        return (
          <div
            key={index}
            onClick={() => toggleBoundary(index)}
            className={`segment-group-boundary${isVisible ? " segment-group-boundary--visible" : ""}`}
            style={{
              position: "absolute",
              left: margin.x + split.segmentGroupBounds.x,
              top: margin.y + split.segmentGroupBounds.y,
              width: split.segmentGroupBounds.width,
              height: split.segmentGroupBounds.height,
              boxSizing: "border-box",
              cursor: "pointer",
              zIndex: 1,
            }}
          />
        );
      })}
    </>
  );
}
