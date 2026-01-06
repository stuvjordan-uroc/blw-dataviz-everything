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
  vizData: VizData,
  canvasData: CanvasData
): { x: number, y: number } {
  return {
    x: Math.round((abstractX / vizData.vizWidth) * canvasData.pixelWidth),
    y: Math.round((abstractY / vizData.vizHeight) * canvasData.pixelHeight)
  }
}

export function scaleLengthToCanvasX(length: number, vizData: VizData, canvasData: CanvasData) {
  return Math.round(canvasData.pixelWidth * length / vizData.vizWidth)
}

export function scaleLengthToCanvasY(length: number, vizData: VizData, canvasData: CanvasData) {
  return Math.round(canvasData.pixelHeight * length / vizData.vizHeight)
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
          if (image) {
            image.offsetToCenter.x = scaleLengthToCanvasX(image.offsetToCenter.x, vizData, canvasData);
            image.offsetToCenter.y = scaleLengthToCanvasY(image.offsetToCenter.y, vizData, canvasData)
          }
          return rg.pointPositions
            .flatMap((pointPosition) => ({
              key: pointKey(pointPosition.point),
              point: pointPosition.point,
              position: scalePositionToCanvas(
                pointPosition.x + splits[splitIdx].segmentGroupBounds.x + rg.bounds.x,
                pointPosition.y + splits[splitIdx].segmentGroupBounds.y + rg.bounds.y,
                vizData,
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
  oldCanvasDimensions: { pixelWidth: number, pixelHeight: number },
  newCanvasDimensions: { pixelWidth: number, pixelHeight: number },
): Map<string, PointDisplay> {
  const result = new Map<string, PointDisplay>();

  for (const [pointKey, oldPointDisplay] of oldVisibleState) {
    result.set(pointKey, {
      ...oldPointDisplay,
      position: {
        x: newCanvasDimensions.pixelWidth * oldPointDisplay.position.x / oldCanvasDimensions.pixelWidth,
        y: newCanvasDimensions.pixelHeight * oldPointDisplay.position.y / oldCanvasDimensions.pixelHeight
      }, //rescale coordinates 
      image: (oldPointDisplay.image) ? {
        image: oldPointDisplay.image.image,
        offsetToCenter: {
          x: newCanvasDimensions.pixelWidth * oldPointDisplay.image.offsetToCenter.x / oldCanvasDimensions.pixelWidth,
          y: newCanvasDimensions.pixelWidth * oldPointDisplay.image.offsetToCenter.y / oldCanvasDimensions.pixelHeight
        }
      } : undefined, //rescale offsets
    });
  }

  return result;
}