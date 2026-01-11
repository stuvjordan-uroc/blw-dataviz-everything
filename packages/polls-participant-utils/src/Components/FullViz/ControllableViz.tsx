import React, { useEffect, useState, useMemo } from "react";
import { VizStateManager } from "../../VizStateManager";
import { useVizCanvas } from "../../UseVizCanvas";
import { VizCanvasMount } from "./VizCanvasMount";
import { AnnotationLayer } from "./AnnotationLayer";
import { AnnotationConfig, createDefaultAnnotations } from "./annotationTypes";
import type { VizRenderConfig } from "../../types";

/**
 * ControllableViz - Full controllable visualization component
 *
 * This component orchestrates the complete visualization rendering:
 * - Uses useVizCanvas hook to manage canvas and VizStateManager
 * - Renders canvas via VizCanvasMount (manual DOM attachment)
 * - Renders annotations via AnnotationLayer (pure React)
 * - Manages annotation state
 * - Provides container for UI controls (to be added by consumer)
 *
 * This is Layer 2b in the component architecture.
 * Consumers can wrap this with SessionVizDisplay (Layer 3) to render multiple visualizations.
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const { vizRefs } = useSessionViz(apiUrl, sessionSlug);
 *   const vizManager = vizRefs.get('viz-id')?.vizManager;
 *
 *   const vizRenderConfig = {
 *     initialCanvasWidth: 800,
 *     initialDisplayMode: 'expanded',
 *     initialViewId: '',
 *     margin: { x: 4, y: 4 },
 *     animation: { appearDuration: 200, disappearDuration: 150, moveDuration: 400, imageChangeDuration: 400 }
 *   };
 *
 *   return (
 *     <ControllableViz
 *       vizManager={vizManager}
 *       vizRenderConfig={vizRenderConfig}
 *       annotationMargin={{ x: 20, y: 20 }}
 *       onViewChange={(viewId) => console.log('View changed:', viewId)}
 *       onDisplayModeChange={(mode) => console.log('Mode changed:', mode)}
 *     />
 *   );
 * }
 * ```
 */
export interface ControllableVizProps {
  /**
   * VizStateManager instance from useSessionViz
   */
  vizManager: VizStateManager;

  /**
   * Configuration for canvas rendering (width, display mode, view, animations, internal padding)
   */
  vizRenderConfig: VizRenderConfig;

  /**
   * External margin around canvas for rendering annotation labels
   * This is space OUTSIDE the canvas, not the internal canvas padding in vizRenderConfig.margin
   */
  annotationMargin: { x: number; y: number };

  /**
   * Default annotation visibility settings
   */
  defaultAnnotations?: {
    showSplitLabels?: boolean;
    showSegmentGroupBoundaries?: boolean;
    showProportionLabels?: boolean;
    showSegmentBoundaries?: boolean;
  };

  /**
   * Enable interactive annotations (click-to-toggle)
   * Default: false
   */
  enableInteractiveAnnotations?: boolean;

  /**
   * Callback when view ID changes (for external controls)
   */
  onViewChange?: (viewId: string) => void;

  /**
   * Callback when display mode changes (for external controls)
   */
  onDisplayModeChange?: (displayMode: "expanded" | "collapsed") => void;

  /**
   * Optional CSS class name
   */
  className?: string;

  /**
   * Optional inline styles
   */
  style?: React.CSSProperties;
}

export function ControllableViz({
  vizManager,
  vizRenderConfig,
  annotationMargin,
  defaultAnnotations,
  enableInteractiveAnnotations = false,
  onViewChange,
  onDisplayModeChange,
  className,
  style,
}: ControllableVizProps) {
  // Manage annotations state
  const [annotations, setAnnotations] = useState<AnnotationConfig>([]);

  // Use custom hook to manage canvas and VizStateManager
  const { canvasElement, canvasId, canvasDimensions } = useVizCanvas(
    vizManager,
    vizRenderConfig,
    vizRenderConfig.initialCanvasWidth,
    (state, origin) => {
      // Always update annotations - segmentDisplay is mutated on every state change
      // (even on canvas resize, bounds are rescaled to new dimensions)
      if (state.segmentDisplay) {
        setAnnotations(
          createDefaultAnnotations(state.segmentDisplay, defaultAnnotations)
        );
      }

      // Notify parent only when the specific property changes
      if (origin === "viewId") {
        onViewChange?.(state.viewId);
      }
      if (origin === "displayMode") {
        onDisplayModeChange?.(state.displayMode);
      }
    }
  );

  return (
    <div className={className} style={style}>
      {/* Canvas container with canvas + annotations */}
      <div
        style={{
          position: "relative",
          width: canvasDimensions.width + 2 * annotationMargin.x,
          height: canvasDimensions.height + 2 * annotationMargin.y,
        }}
      >
        {/* Manually attached canvas */}
        <VizCanvasMount canvasElement={canvasElement} />

        {/* React-rendered annotation overlays */}
        {annotations.length > 0 && (
          <AnnotationLayer
            annotations={annotations}
            margin={annotationMargin}
            onAnnotationToggle={setAnnotations}
            enableInteractive={enableInteractiveAnnotations}
          />
        )}
      </div>
    </div>
  );
}
