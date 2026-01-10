import React, { useEffect, useState, useRef } from "react";
import { VizStateManager } from "../../VizStateManager";
import { VizRenderConfig } from "../../types";
import {
  VizLogicalState,
  StateChangeOrigin,
} from "../../VizStateManager/types";
import { VizCanvas } from "./VizCanvas";
import { AnnotationConfig } from "./annotationTypes";

/**
 * VizCanvasWithAnnotations - Wraps VizCanvas with annotation overlays
 *
 * Renders a canvas with overlay divs for:
 * - Split labels (describing each segment group)
 * - Segment group boundaries (outer rectangles)
 * - Proportion labels (percentages for each response group)
 * - Segment boundaries (inner rectangles for each segment)
 *
 * The annotations prop embeds both the rendering data (bounds, labels, proportions)
 * and visibility flags (showSplitLabel, showSegmentBoundary, etc.) in a single
 * structure that mirrors VizLogicalState.segmentDisplay.
 *
 * This component:
 * - Wraps VizCanvas to render the points
 * - Subscribes to VizStateManager state updates
 * - Renders annotation overlays using absolutely positioned divs
 * - Handles click interactions if enableInteractiveAnnotations is true
 *
 * @example
 * ```tsx
 * const [annotations, setAnnotations] = useState<AnnotationConfig>(
 *   createDefaultAnnotations(initialSegmentDisplay)
 * );
 *
 * // Subscribe to state changes to rebuild annotations
 * useEffect(() => {
 *   return vizManager.subscribeToStateUpdate(canvasId, (state) => {
 *     setAnnotations(createDefaultAnnotations(state.segmentDisplay, {
 *       showSplitLabels: true,
 *       showSegmentBoundaries: true
 *     }));
 *   });
 * }, []);
 *
 * <VizCanvasWithAnnotations
 *   vizManager={vizManager}
 *   width={width}
 *   initialConfig={config}
 *   margin={{ x: 20, y: 20 }}
 *   annotations={annotations}
 *   onAnnotationsChange={setAnnotations}
 * />
 * ```
 */

export interface VizCanvasWithAnnotationsProps {
  /**
   * VizStateManager instance to attach the canvas to.
   */
  vizManager: VizStateManager;

  /**
   * Canvas width in pixels.
   */
  width: number;

  /**
   * Initial configuration for the canvas.
   */
  initialConfig: VizRenderConfig;

  /**
   * Margin around the canvas for positioning labels.
   * Should match the margin in initialConfig.
   */
  margin: {
    x: number;
    y: number;
  };

  /**
   * Annotation configuration with visibility flags.
   * Should be updated by parent when segmentDisplay changes.
   */
  annotations: AnnotationConfig;

  /**
   * Optional callback when user interacts with annotations.
   * Only called if enableInteractiveAnnotations is true.
   */
  onAnnotationsChange?: (newAnnotations: AnnotationConfig) => void;

  /**
   * Enable click-to-toggle interactions on boundaries and labels.
   * Default: false
   */
  enableInteractiveAnnotations?: boolean;

  /**
   * Optional CSS class name for the container div.
   */
  className?: string;

  /**
   * Optional inline styles for the container div.
   */
  style?: React.CSSProperties;
}

export function VizCanvasWithAnnotations({
  vizManager,
  width,
  initialConfig,
  margin,
  annotations,
  onAnnotationsChange,
  enableInteractiveAnnotations = false,
  className,
  style,
}: VizCanvasWithAnnotationsProps) {
  const [canvasId, setCanvasId] = useState<number | null>(null);
  const [currentState, setCurrentState] = useState<VizLogicalState | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to state updates to track current state
  useEffect(() => {
    if (canvasId === null) return;

    const unsubscribe = vizManager.subscribeToStateUpdate(
      canvasId,
      (state: VizLogicalState, origin: StateChangeOrigin) => {
        setCurrentState(state);
      }
    );

    return unsubscribe;
  }, [vizManager, canvasId]);

  // Compute container dimensions based on width and margin
  const containerWidth = width + 2 * margin.x;
  const aspectRatio = initialConfig.initialCanvasWidth
    ? initialConfig.initialCanvasWidth / width
    : 1;
  const canvasHeight = width / aspectRatio;
  const containerHeight = canvasHeight + 2 * margin.y;

  // Toggle handlers for interactive mode
  const toggleSplitLabel = (splitIndex: number) => {
    if (!enableInteractiveAnnotations || !onAnnotationsChange) return;

    const newAnnotations = annotations.map((split, i) =>
      i === splitIndex
        ? { ...split, showSplitLabel: !split.showSplitLabel }
        : split
    );
    onAnnotationsChange(newAnnotations);
  };

  const toggleSegmentGroupBoundary = (splitIndex: number) => {
    if (!enableInteractiveAnnotations || !onAnnotationsChange) return;

    const newAnnotations = annotations.map((split, i) =>
      i === splitIndex
        ? {
            ...split,
            showSegmentGroupBoundary: !split.showSegmentGroupBoundary,
          }
        : split
    );
    onAnnotationsChange(newAnnotations);
  };

  const toggleProportionLabel = (splitIndex: number, segmentIndex: number) => {
    if (!enableInteractiveAnnotations || !onAnnotationsChange) return;

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
    onAnnotationsChange(newAnnotations);
  };

  const toggleSegmentBoundary = (splitIndex: number, segmentIndex: number) => {
    if (!enableInteractiveAnnotations || !onAnnotationsChange) return;

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
    onAnnotationsChange(newAnnotations);
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        width: containerWidth,
        height: containerHeight,
        ...style,
      }}
    >
      {/* Canvas centered with margin */}
      <div
        style={{
          position: "absolute",
          left: margin.x,
          top: margin.y,
          width: width,
          height: canvasHeight,
        }}
      >
        <VizCanvas
          vizManager={vizManager}
          width={width}
          initialConfig={initialConfig}
          onAttached={({ canvasId }) => setCanvasId(canvasId)}
        />
      </div>

      {/* Annotation overlays */}
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
                pointerEvents: enableInteractiveAnnotations ? "auto" : "none",
                cursor: enableInteractiveAnnotations ? "pointer" : "default",
                boxSizing: "border-box",
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
                pointerEvents: enableInteractiveAnnotations ? "auto" : "none",
                cursor: enableInteractiveAnnotations ? "pointer" : "default",
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
                    pointerEvents: enableInteractiveAnnotations
                      ? "auto"
                      : "none",
                    cursor: enableInteractiveAnnotations
                      ? "pointer"
                      : "default",
                    boxSizing: "border-box",
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
                    pointerEvents: enableInteractiveAnnotations
                      ? "auto"
                      : "none",
                    cursor: enableInteractiveAnnotations
                      ? "pointer"
                      : "default",
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
    </div>
  );
}
