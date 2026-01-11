import React from "react";
import { AnnotationConfig } from "./annotationTypes";

/**
 * AnnotationLayer - Pure React component for rendering annotation overlays
 *
 * Renders absolutely positioned divs for:
 * - Split labels (describing each segment group)
 * - Segment group boundaries (outer rectangles)
 * - Proportion labels (percentages for each response group)
 * - Segment boundaries (inner rectangles for each segment)
 *
 * All positioning is relative to the canvas-container.
 * The margin offset positions annotations relative to the canvas.
 *
 * This is a pure React component - no manual DOM manipulation.
 * All interactivity is handled through React state and event handlers.
 */
export interface AnnotationLayerProps {
  /**
   * Annotation configuration with visibility flags and rendering data
   */
  annotations: AnnotationConfig;

  /**
   * Margin offset for positioning annotations relative to canvas
   */
  margin: { x: number; y: number };

  /**
   * Optional callback when user clicks an annotation
   * If provided, annotations become interactive (clickable)
   */
  onAnnotationToggle?: (newAnnotations: AnnotationConfig) => void;

  /**
   * Enable interactive mode (click-to-toggle)
   * Default: false
   */
  enableInteractive?: boolean;
}

export function AnnotationLayer({
  annotations,
  margin,
  onAnnotationToggle,
  enableInteractive = false,
}: AnnotationLayerProps) {
  const isInteractive = enableInteractive && !!onAnnotationToggle;

  // Toggle handlers
  const toggleSplitLabel = (splitIndex: number) => {
    if (!isInteractive) return;
    const newAnnotations = annotations.map((split, i) =>
      i === splitIndex
        ? { ...split, showSplitLabel: !split.showSplitLabel }
        : split
    );
    onAnnotationToggle(newAnnotations);
  };

  const toggleSegmentGroupBoundary = (splitIndex: number) => {
    if (!isInteractive) return;
    const newAnnotations = annotations.map((split, i) =>
      i === splitIndex
        ? {
            ...split,
            showSegmentGroupBoundary: !split.showSegmentGroupBoundary,
          }
        : split
    );
    onAnnotationToggle(newAnnotations);
  };

  const toggleProportionLabel = (splitIndex: number, segmentIndex: number) => {
    if (!isInteractive) return;
    const newAnnotations = annotations.map((split, i) =>
      i === splitIndex
        ? {
            ...split,
            responseGroups: split.responseGroups.map((rg, j) =>
              j === segmentIndex
                ? { ...rg, showProportionLabel: !rg.showProportionLabel }
                : rg
            ),
          }
        : split
    );
    onAnnotationToggle(newAnnotations);
  };

  const toggleSegmentBoundary = (splitIndex: number, segmentIndex: number) => {
    if (!isInteractive) return;
    const newAnnotations = annotations.map((split, i) =>
      i === splitIndex
        ? {
            ...split,
            responseGroups: split.responseGroups.map((rg, j) =>
              j === segmentIndex
                ? { ...rg, showSegmentBoundary: !rg.showSegmentBoundary }
                : rg
            ),
          }
        : split
    );
    onAnnotationToggle(newAnnotations);
  };

  return (
    <>
      {annotations.map((split, splitIndex) => (
        <React.Fragment key={splitIndex}>
          {/* Segment group boundary */}
          {split.showSegmentGroupBoundary && (
            <div
              onClick={() => toggleSegmentGroupBoundary(splitIndex)}
              style={{
                position: "absolute",
                left: margin.x + split.segmentGroupBounds.x,
                top: margin.y + split.segmentGroupBounds.y,
                width: split.segmentGroupBounds.width,
                height: split.segmentGroupBounds.height,
                border: "2px solid rgba(0, 0, 0, 0.5)",
                boxSizing: "border-box",
                pointerEvents: isInteractive ? "auto" : "none",
                cursor: isInteractive ? "pointer" : "default",
              }}
            />
          )}

          {/* Split label */}
          {split.showSplitLabel && (
            <div
              onClick={() => toggleSplitLabel(splitIndex)}
              style={{
                position: "absolute",
                left: margin.x + split.segmentGroupBounds.x,
                top: margin.y + split.segmentGroupBounds.y - 20,
                fontSize: "12px",
                fontWeight: "bold",
                color: "#333",
                pointerEvents: isInteractive ? "auto" : "none",
                cursor: isInteractive ? "pointer" : "default",
                userSelect: "none",
              }}
            >
              {split.groups
                .filter((g) => g.responseGroup !== null)
                .map((g) => g.responseGroup!.label)
                .join(", ")}
            </div>
          )}

          {/* Segments within this split */}
          {split.responseGroups.map((rg, segmentIndex) => (
            <React.Fragment key={segmentIndex}>
              {/* Segment boundary */}
              {rg.showSegmentBoundary && (
                <div
                  onClick={() =>
                    toggleSegmentBoundary(splitIndex, segmentIndex)
                  }
                  style={{
                    position: "absolute",
                    left: margin.x + rg.bounds.x,
                    top: margin.y + rg.bounds.y,
                    width: rg.bounds.width,
                    height: rg.bounds.height,
                    border: "1px solid rgba(100, 100, 100, 0.3)",
                    boxSizing: "border-box",
                    pointerEvents: isInteractive ? "auto" : "none",
                    cursor: isInteractive ? "pointer" : "default",
                  }}
                />
              )}

              {/* Proportion label */}
              {rg.showProportionLabel && (
                <div
                  onClick={() =>
                    toggleProportionLabel(splitIndex, segmentIndex)
                  }
                  style={{
                    position: "absolute",
                    left: margin.x + rg.bounds.x + rg.bounds.width / 2,
                    top: margin.y + rg.bounds.y + rg.bounds.height + 5,
                    transform: "translateX(-50%)",
                    fontSize: "11px",
                    color: "#666",
                    pointerEvents: isInteractive ? "auto" : "none",
                    cursor: isInteractive ? "pointer" : "default",
                    userSelect: "none",
                  }}
                >
                  {(rg.proportion * 100).toFixed(1)}%
                </div>
              )}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </>
  );
}
