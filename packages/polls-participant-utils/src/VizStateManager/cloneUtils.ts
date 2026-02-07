import { VizLogicalState, SegmentGroupDisplay, VizData } from "./types";
import { PointDisplay, PointLoadedImage } from "../types";

/**
 * Clones a PointLoadedImage by preserving the HTMLImageElement reference
 * (images are immutable and don't need deep cloning)
 */
function clonePointLoadedImage(image: PointLoadedImage): PointLoadedImage {
  return {
    image: image.image, // Preserve the reference - images are immutable
    offsetToCenter: {
      x: image.offsetToCenter.x,
      y: image.offsetToCenter.y
    }
  };
}

/**
 * Clones a PointDisplay object, properly handling image references
 */
function clonePointDisplay(point: PointDisplay): PointDisplay {
  return {
    key: point.key,
    point: structuredClone(point.point),
    position: {
      x: point.position.x,
      y: point.position.y
    },
    image: point.image ? clonePointLoadedImage(point.image) : undefined,
    opacity: point.opacity,
    transitioningFromImage: point.transitioningFromImage
      ? clonePointLoadedImage(point.transitioningFromImage)
      : undefined,
    crossFadeProgress: point.crossFadeProgress
  };
}

/**
 * Clones a Map of PointDisplay objects
 */
function clonePointDisplayMap(map: Map<string, PointDisplay>): Map<string, PointDisplay> {
  const cloned = new Map<string, PointDisplay>();
  for (const [key, value] of map.entries()) {
    cloned.set(key, clonePointDisplay(value));
  }
  return cloned;
}

/**
 * Clones VizLogicalState, properly handling Maps and HTMLImageElement references
 */
export function cloneVizLogicalState(state: VizLogicalState): VizLogicalState {
  return {
    displayMode: state.displayMode,
    viewId: state.viewId,
    segmentDisplay: structuredClone(state.segmentDisplay),
    gridLabelsDisplay: structuredClone(state.gridLabelsDisplay),
    targetVisibleState: clonePointDisplayMap(state.targetVisibleState)
  };
}

/**
 * Clones a SingleSplitCanvas logical state (subset of VizLogicalState)
 */
export function cloneSingleSplitLogicalState(
  state: Omit<VizLogicalState, "viewId" | "segmentDisplay" | "gridLabelsDisplay"> & {
    segmentDisplay: SegmentGroupDisplay
  }
): typeof state {
  return {
    displayMode: state.displayMode,
    segmentDisplay: structuredClone(state.segmentDisplay),
    targetVisibleState: clonePointDisplayMap(state.targetVisibleState)
  };
}

/**
 * Clones VizData, properly handling Maps and HTMLImageElement references
 */
export function cloneVizData(data: VizData): VizData {
  // Clone the loadedImages map, preserving HTMLImageElement references
  const clonedLoadedImages = new Map<string, PointLoadedImage>();
  for (const [key, value] of data.loadedImages.entries()) {
    clonedLoadedImages.set(key, clonePointLoadedImage(value));
  }

  return {
    ...structuredClone({
      visualizationId: data.visualizationId,
      config: data.config,
      sequenceNumber: data.sequenceNumber,
      splits: data.splits,
      basisSplitIndices: data.basisSplitIndices,
      lastUpdated: data.lastUpdated,
      viewMaps: data.viewMaps,
      gridLabels: data.gridLabels,
      viewIdLookup: data.viewIdLookup,
      vizWidth: data.vizWidth,
      vizHeight: data.vizHeight
    }),
    loadedImages: clonedLoadedImages
  };
}
