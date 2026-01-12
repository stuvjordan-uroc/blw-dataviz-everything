import React, { useState } from "react";
import { SegmentGroupDisplay } from "../../VizStateManager/types";

/**
 * Segments - Renders segment boundaries and proportion labels
 *
 * Each segment (response group within a split) can have both its boundary
 * and proportion label toggled by clicking.
 *
 * Initially:
 * - Boundaries are visible
 * - Proportion labels are hidden
 *
 * Clicking a segment toggles both boundary and label together.
 *
 * CSS Classes (for custom styling):
 * - .segment-boundary: Segment boundaries
 * - .segment-proportion-label: Proportion percentage labels
 */
export interface SegmentsProps {
  segmentDisplay: SegmentGroupDisplay[];
  margin: { x: number; y: number };
}

export function Segments({ segmentDisplay, margin }: SegmentsProps) {
  // Track which segments have boundaries visible (default: all)
  const [visibleBoundaries, setVisibleBoundaries] = useState<Set<string>>(
    new Set(
      segmentDisplay.flatMap((split, splitIdx) =>
        split.responseGroups.map((_, segIdx) => `${splitIdx}-${segIdx}`)
      )
    )
  );

  // Track which segments have proportion labels visible (default: none)
  const [visibleProportions, setVisibleProportions] = useState<Set<string>>(
    new Set()
  );

  const toggleSegment = (splitIndex: number, segmentIndex: number) => {
    const key = `${splitIndex}-${segmentIndex}`;

    const newBoundaries = new Set(visibleBoundaries);
    const newProportions = new Set(visibleProportions);

    if (visibleBoundaries.has(key)) {
      // Currently visible - hide both
      newBoundaries.delete(key);
      newProportions.delete(key);
    } else {
      // Currently hidden - show both
      newBoundaries.add(key);
      newProportions.add(key);
    }

    setVisibleBoundaries(newBoundaries);
    setVisibleProportions(newProportions);
  };

  return (
    <>
      {segmentDisplay.map((split, splitIndex) =>
        split.responseGroups.map((rg, segmentIndex) => {
          const key = `${splitIndex}-${segmentIndex}`;
          const showBoundary = visibleBoundaries.has(key);
          const showProportion = visibleProportions.has(key);

          return (
            <React.Fragment key={key}>
              {/* Segment boundary */}
              {showBoundary && (
                <div
                  onClick={() => toggleSegment(splitIndex, segmentIndex)}
                  className="segment-boundary"
                  style={{
                    position: "absolute",
                    left: margin.x + rg.bounds.x,
                    top: margin.y + rg.bounds.y,
                    width: rg.bounds.width,
                    height: rg.bounds.height,
                    border: "1px solid rgba(100, 100, 100, 0.3)",
                    boxSizing: "border-box",
                    cursor: "pointer",
                  }}
                />
              )}

              {/* Proportion label */}
              {showProportion && (
                <div
                  onClick={() => toggleSegment(splitIndex, segmentIndex)}
                  className="segment-proportion-label"
                  style={{
                    position: "absolute",
                    left: margin.x + rg.bounds.x + rg.bounds.width / 2,
                    top: margin.y + rg.bounds.y + rg.bounds.height + 5,
                    transform: "translateX(-50%)",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {(rg.proportion * 100).toFixed(1)}%
                </div>
              )}
            </React.Fragment>
          );
        })
      )}
    </>
  );
}
