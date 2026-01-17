import React, { useState, useLayoutEffect, useRef } from "react";
import { SegmentGroupDisplay } from "../../VizStateManager/types";

/**
 * Segments - Renders segment boundaries and proportion labels
 *
 * Each segment (response group within a split) can be clicked to toggle visibility.
 * Click toggles both the boundary and proportion label together.
 *
 * Proportion labels:
 * - Centered horizontally on their segment
 * - Bottom edge aligned to top edge of segment
 * - Only rendered when visible (to avoid unnecessary component execution)
 *
 * CSS Classes (for custom styling):
 * - .segment-boundary: All segment boundaries
 * - .segment-boundary--visible: Added when segment boundary is toggled visible
 * - .segment-proportion-label-wrapper: Proportion label wrappers (only when visible)
 * - .segment-proportion-label-wrapper--visible: Always present when wrapper is rendered
 */
export interface SegmentsProps {
  segmentDisplay: SegmentGroupDisplay[];
  annotationMargin: { x: number; y: number };

  /**
   * Component to render proportion label content
   * Receives the proportion value (0-1)
   */
  ProportionLabel: React.ComponentType<{ proportion: number }>;
}

export function Segments({
  segmentDisplay,
  annotationMargin,
  ProportionLabel,
}: SegmentsProps) {
  // Track which segments are visible
  // Start with all boundaries visible
  const [visibleSegments, setVisibleSegments] = useState<Set<string>>(
    new Set(
      segmentDisplay.flatMap((split, splitIdx) =>
        split.responseGroups.map((_, segIdx) => `${splitIdx}-${segIdx}`),
      ),
    ),
  );

  const proportionLabelRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const toggleSegment = (splitIndex: number, segmentIndex: number) => {
    const key = `${splitIndex}-${segmentIndex}`;
    const newVisible = new Set(visibleSegments);

    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }

    setVisibleSegments(newVisible);
  };

  // Position proportion labels based on measured dimensions
  useLayoutEffect(() => {
    proportionLabelRefs.current.forEach((labelDiv, key) => {
      const [splitIndexStr, segmentIndexStr] = key.split("-");
      const splitIndex = parseInt(splitIndexStr, 10);
      const segmentIndex = parseInt(segmentIndexStr, 10);

      const rg = segmentDisplay[splitIndex].responseGroups[segmentIndex];
      const labelWidth = labelDiv.offsetWidth;
      const labelHeight = labelDiv.offsetHeight;

      // Center horizontally on segment
      const left = rg.bounds.x + rg.bounds.width / 2 - labelWidth / 2;
      // Bottom edge at top of segment
      const top = rg.bounds.y - labelHeight;

      labelDiv.style.left = `${annotationMargin.x + left}px`;
      labelDiv.style.top = `${annotationMargin.y + top}px`;
    });
  }, [segmentDisplay, annotationMargin, visibleSegments]);

  return (
    <>
      {segmentDisplay.map((split, splitIndex) =>
        split.responseGroups.map((rg, segmentIndex) => {
          const key = `${splitIndex}-${segmentIndex}`;
          const isVisible = visibleSegments.has(key);

          return (
            <React.Fragment key={key}>
              {/* Segment boundary */}
              <div
                onClick={() => toggleSegment(splitIndex, segmentIndex)}
                className={`segment-boundary${isVisible ? " segment-boundary--visible" : ""}`}
                style={{
                  position: "absolute",
                  left: annotationMargin.x + rg.bounds.x,
                  top: annotationMargin.y + rg.bounds.y,
                  width: rg.bounds.width,
                  height: rg.bounds.height,
                  boxSizing: "border-box",
                  cursor: "pointer",
                  zIndex: 2,
                }}
              />

              {/* Proportion label - only render when visible */}
              {isVisible && (
                <div
                  ref={(el) => {
                    if (el) {
                      proportionLabelRefs.current.set(key, el);
                    } else {
                      proportionLabelRefs.current.delete(key);
                    }
                  }}
                  onClick={() => toggleSegment(splitIndex, segmentIndex)}
                  className="segment-proportion-label-wrapper segment-proportion-label-wrapper--visible"
                  style={{
                    position: "absolute",
                    // Initial positioning - will be adjusted by useLayoutEffect
                    left: 0,
                    top: 0,
                    cursor: "pointer",
                    pointerEvents: "none",
                    userSelect: "none",
                    zIndex: 4,
                  }}
                >
                  <ProportionLabel proportion={rg.proportion} />
                </div>
              )}
            </React.Fragment>
          );
        }),
      )}
    </>
  );
}
