/**
 * Point display computation functions for participant-side visualization.
 * 
 * 
 * Coordinate System Transformation:
 * Server stores positions relative to segment bounds:
 *   - Segment group bounds: {x, y, width, height} origin for x, y is 0,0 of canvas
 *   - Segment bounds: {x, y, width, height} origin of for x,y is top left of segment group
 *   - Point positions: {x, y} relative to top left of segment
 * 
 * We transform to canvas-relative coordinates:
 *   - canvasX = segmentGroupBounds.x + segmentBounds.x + pointX
 *   - canvasY = segmentGroupBound.y + segmentBounds.y + pointY
 * 
 * Exports:
 * - initializePointPositions: Create new map with initial keys + positions
 * - updatePointIdentities: Add/remove points when ServerState changes
 * - updatePositionsForViewChange: Update positions when ViewState changes
 * - updatePositionsForServerChange: Update positions when ServerState changes
 * - computePointPositionsDiff: Compare two states for animation
 * - getPointKey: Generate unique identifier for a point
 */

import { SplitWithSegmentGroup } from "shared-types";
import { VizData, CanvasData } from "./types";
import { PointDisplay } from "../types";
import { pointKey } from "../utils";

export function scalePositionToCanvas(
  abstractX: number,
  abstractY: number,
  vizWidth: number,
  vizHeight: number,
  canvasData: CanvasData
): { x: number, y: number } {
  const drawableWidth = canvasData.pixelWidth - 2 * canvasData.margin.x;
  const drawableHeight = canvasData.pixelHeight - 2 * canvasData.margin.y;
  return {
    x: Math.round((abstractX / vizWidth) * drawableWidth + canvasData.margin.x),
    y: Math.round((abstractY / vizHeight) * drawableHeight + canvasData.margin.y)
  }
}

export function scaleLengthToCanvasX(length: number, vizWidth: number, canvasData: CanvasData) {
  const drawableWidth = canvasData.pixelWidth - 2 * canvasData.margin.x;
  return Math.round(drawableWidth * length / vizWidth)
}

export function scaleLengthToCanvasY(length: number, vizHeight: number, canvasData: CanvasData) {
  const drawableHeight = canvasData.pixelHeight - 2 * canvasData.margin.y;
  return Math.round(drawableHeight * length / vizHeight)
}

/**
 * Computes and returns the full target visible state.
 * 
 * Do not use this for incremental updates! 
 * 
 * @param splits 
 * @param displayMode 
 * @param viewId 
 * @param vizData 
 * @returns Map<string, PointDisplay>
 */
export function computeTargetVisibleState(
  splits: SplitWithSegmentGroup[],
  displayMode: "expanded" | "collapsed",
  viewId: string,
  vizData: VizData,
  canvasData: CanvasData
): Map<string, PointDisplay> {

  //get the splits for the selected view
  const viewSplitIndices = vizData.viewMaps[viewId]
  if (!viewSplitIndices) {
    throw new Error(`VizManager for viz with id ${vizData.visualizationId} tried to compute view with id ${viewId}, but no such view exists.`)
  }

  //iterate through the splits and response groups within the splits to
  //get the point positions and images.
  const pointDisplays = viewSplitIndices
    .flatMap((splitIdx) =>
      splits[splitIdx]
        .responseGroups[displayMode]
        .flatMap((rg) => {
          const image = vizData.loadedImages.get(rg.pointImage.svgDataURL)
          return rg.pointPositions
            .flatMap((pointPosition) => ({
              key: pointKey(pointPosition.point),
              point: pointPosition.point,
              position: scalePositionToCanvas(
                pointPosition.x + splits[splitIdx].segmentGroupBounds.x + rg.bounds.x,
                pointPosition.y + splits[splitIdx].segmentGroupBounds.y + rg.bounds.y,
                vizData.vizWidth,
                vizData.vizHeight,
                canvasData
              ),
              image: image
            }))
        })
    );

  // Convert array to Map using key field
  return new Map(pointDisplays.map(pd => [pd.key, pd]));
}

export function rescaleVisibleState(
  oldVisibleState: Map<string, PointDisplay>,
  oldCanvasDimensions: { pixelWidth: number, pixelHeight: number, margin: { x: number, y: number } },
  newCanvasDimensions: { pixelWidth: number, pixelHeight: number, margin: { x: number, y: number } },
): Map<string, PointDisplay> {
  const result = new Map<string, PointDisplay>();

  const oldDrawableWidth = oldCanvasDimensions.pixelWidth - 2 * oldCanvasDimensions.margin.x;
  const oldDrawableHeight = oldCanvasDimensions.pixelHeight - 2 * oldCanvasDimensions.margin.y;
  const newDrawableWidth = newCanvasDimensions.pixelWidth - 2 * newCanvasDimensions.margin.x;
  const newDrawableHeight = newCanvasDimensions.pixelHeight - 2 * newCanvasDimensions.margin.y;

  for (const [pointKey, oldPointDisplay] of oldVisibleState) {
    result.set(pointKey, {
      ...oldPointDisplay,
      position: {
        x: Math.round((oldPointDisplay.position.x - oldCanvasDimensions.margin.x) * newDrawableWidth / oldDrawableWidth + newCanvasDimensions.margin.x),
        y: Math.round((oldPointDisplay.position.y - oldCanvasDimensions.margin.y) * newDrawableHeight / oldDrawableHeight + newCanvasDimensions.margin.y)
      }, //rescale coordinates 
      image: (oldPointDisplay.image) ? {
        image: oldPointDisplay.image.image,
        offsetToCenter: {
          x: Math.round(oldPointDisplay.image.offsetToCenter.x * newDrawableWidth / oldDrawableWidth),
          y: Math.round(oldPointDisplay.image.offsetToCenter.y * newDrawableHeight / oldDrawableHeight)
        }
      } : undefined, //rescale offsets
    });
  }

  return result;
}