import { ReactElement, cloneElement, useEffect, useRef, useState } from "react";
import { DebugBoundaries } from "./DebugBoundaries";
import { SingleSplitCanvas } from "../../VizStateManager/SingleSplitCanvas";
import type { VizStateManager } from "../../VizStateManager";
import { logSingleSplitGeometry, logFullVizGeometry } from "./geometryLogger";

/**
 * Shape of the ref exposed by SingleSplitViz
 */
export interface SingleSplitVizRef {
  manager: SingleSplitCanvas | null;
  annotationMargin: { x: number; y: number };
  canvasDimensions: { width: number; height: number } | null;
  displayMode: "expanded" | "collapsed";
  isAnimating: boolean;
}

/**
 * Shape of the ref exposed by FullViz/ControllableViz
 */
export interface FullVizRef {
  vizState: {
    segmentDisplay: Array<{
      segmentGroupBounds: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      responseGroups: Array<{
        bounds: { x: number; y: number; width: number; height: number };
        label: string;
      }>;
    }>;
  } | null;
  annotationMargin: { x: number; y: number };
  canvasDimensions: { width: number; height: number } | null;
  displayMode: "expanded" | "collapsed";
  isAnimating: boolean;
  canvasId: number | null;
  vizManager: VizStateManager;
}

type VizRef = SingleSplitVizRef | FullVizRef;

/**
 * Type guard to check if ref is from SingleSplitViz
 */
function isSingleSplitVizRef(ref: VizRef): ref is SingleSplitVizRef {
  return "manager" in ref && ref.manager !== null;
}

/**
 * Type guard to check if ref is from FullViz
 */
function isFullVizRef(ref: VizRef): ref is FullVizRef {
  return "vizState" in ref && ref.vizState !== null;
}

export interface DebugWrapperProps {
  /**
   * Whether to show debug boundaries (typically set to import.meta.env.DEV)
   */
  show: boolean;

  /**
   * Single child element (SingleSplitViz or FullViz component)
   */
  children: ReactElement;
}

/**
 * DebugWrapper - Development tool for visualizing geometry boundaries
 *
 * Wraps visualization components and displays outline overlays for:
 * - Annotation margins (dotted border)
 * - Segment group bounds (dashed border)
 * - Individual segment bounds (solid border)
 *
 * Usage:
 * ```tsx
 * <DebugWrapper show={import.meta.env.DEV}>
 *   <SingleSplitViz {...props} />
 * </DebugWrapper>
 * ```
 *
 * The wrapper subscribes to visualization state updates and keeps boundaries
 * synchronized with canvas rendering. In production builds with constant
 * show=false, the entire wrapper can be tree-shaken.
 */
export function DebugWrapper({ show, children }: DebugWrapperProps) {
  const childRef = useRef<VizRef>(null);
  const [readyTrigger, setReadyTrigger] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [debugData, setDebugData] = useState<{
    segmentDisplay:
      | {
          segmentGroupBounds: {
            x: number;
            y: number;
            width: number;
            height: number;
          };
          responseGroups: Array<{
            bounds: { x: number; y: number; width: number; height: number };
            label: string;
          }>;
        }
      | Array<{
          segmentGroupBounds: {
            x: number;
            y: number;
            width: number;
            height: number;
          };
          responseGroups: Array<{
            bounds: { x: number; y: number; width: number; height: number };
            label: string;
          }>;
        }>;
    annotationMargin: { x: number; y: number };
    canvasDimensions: { width: number; height: number };
  } | null>(null);

  // Poll for animation state changes
  useEffect(() => {
    if (!show || !childRef.current) {
      return;
    }

    const interval = setInterval(() => {
      const ref = childRef.current;
      if (!ref) return;

      // Update animation state
      setIsAnimating(ref.isAnimating);
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [show, readyTrigger]);

  useEffect(() => {
    if (!show || !childRef.current) {
      setDebugData(null);
      return;
    }

    const ref = childRef.current;

    // Handle SingleSplitViz (subscribes to manager state updates)
    if (isSingleSplitVizRef(ref)) {
      const { manager, annotationMargin, canvasDimensions, displayMode } = ref;

      if (!manager || !canvasDimensions) {
        return;
      }

      // Subscribe to state updates (callback is immediately invoked with current state)
      const unsubscribe = manager.subscribeToStateUpdate((state) => {
        setDebugData({
          segmentDisplay: {
            segmentGroupBounds: state.segmentDisplay.segmentGroupBounds,
            responseGroups: state.segmentDisplay.responseGroups,
          },
          annotationMargin,
          canvasDimensions,
        });
      });

      return unsubscribe;
    }

    // Handle FullViz (already has vizState from useVizCanvas hook)
    if (isFullVizRef(ref)) {
      const { vizState, annotationMargin, canvasDimensions } = ref;

      if (!vizState?.segmentDisplay || !canvasDimensions) {
        return;
      }

      setDebugData({
        segmentDisplay: vizState.segmentDisplay,
        annotationMargin,
        canvasDimensions,
      });
    }
  }, [show, readyTrigger]);

  // Handle log button click
  const handleLogGeometry = () => {
    const ref = childRef.current;
    if (!ref) {
      console.warn("[DebugWrapper] Cannot log geometry - ref not available");
      return;
    }

    if (isSingleSplitVizRef(ref)) {
      logSingleSplitGeometry(ref);
    } else if (isFullVizRef(ref)) {
      logFullVizGeometry(ref);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {cloneElement(children, {
        ref: childRef,
        onReady: () => setReadyTrigger((prev) => prev + 1),
      })}
      {show && debugData && <DebugBoundaries {...debugData} />}
      {show && childRef.current && (
        <button
          onClick={handleLogGeometry}
          disabled={isAnimating}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            padding: "8px 16px",
            backgroundColor: isAnimating ? "#ccc" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isAnimating ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            zIndex: 1000,
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            opacity: isAnimating ? 0.6 : 1,
          }}
          title={
            isAnimating
              ? "Wait for animation to complete"
              : "Log current geometry to console"
          }
        >
          {isAnimating ? "Animating..." : "📊 Log Geometry"}
        </button>
      )}
    </div>
  );
}
