import { RectBounds, SplitWithSegmentGroup } from "shared-types";
import { CanvasData, SegmentGroupDisplay, VizData } from './types';
import { scaleLengthToCanvasX, scaleLengthToCanvasY, scalePositionToCanvas } from "./pointDisplayComputation";

export function scaleRectToCanvas(rect: RectBounds, vizWidth: number, vizHeight: number, canvasData: CanvasData) {
  const { x, y } = scalePositionToCanvas(rect.x, rect.y, vizWidth, vizHeight, canvasData);
  return ({
    x: x,
    y: y,
    width: scaleLengthToCanvasX(rect.width, vizWidth, canvasData),
    height: scaleLengthToCanvasY(rect.height, vizHeight, canvasData)
  })
}

export function computeSegmentDisplay(
  splits: SplitWithSegmentGroup[],
  displayMode: "expanded" | "collapsed",
  viewId: string,
  vizData: VizData,
  canvasData: CanvasData
): SegmentGroupDisplay[] {


  //get the splits for the selected view
  const viewSplitIndices = vizData.viewMaps[viewId]
  if (!viewSplitIndices) {
    throw new Error(`VizManager for viz with id ${vizData.visualizationId} tried to compute view with id ${viewId}, but no such view exists.`)
  }

  //iterate through the splits and response groups within the splits to
  //get the segment group and segment positions and bounds, scaled to canvas dimensions
  return viewSplitIndices
    .map((splitIdx) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { points, responseGroups, ...split } = splits[splitIdx];
      const displayedResponseGroups = responseGroups[displayMode];
      return ({
        ...split,
        segmentGroupBounds: scaleRectToCanvas(split.segmentGroupBounds, vizData.vizWidth, vizData.vizHeight, canvasData),
        responseGroups: displayedResponseGroups.map((rg) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { pointPositions, pointImage, ...responseGroup } = rg;
          return ({
            ...responseGroup,
            bounds: scaleRectToCanvas(
              {
                ...responseGroup.bounds,
                x: split.segmentGroupBounds.x + responseGroup.bounds.x,
                y: split.segmentGroupBounds.y + responseGroup.bounds.y
              },
              vizData.vizWidth,
              vizData.vizHeight,
              canvasData
            )
          })
        })
      })
    })
}

export function rescaleSegmentDisplay(
  oldSegmentDisplay: SegmentGroupDisplay[],
  oldCanvasDimensions: { pixelWidth: number, pixelHeight: number, margin: { x: number, y: number } },
  newCanvasDimensions: { pixelWidth: number, pixelHeight: number, margin: { x: number, y: number } }
): SegmentGroupDisplay[] {
  const oldDrawableWidth = oldCanvasDimensions.pixelWidth - 2 * oldCanvasDimensions.margin.x;
  const oldDrawableHeight = oldCanvasDimensions.pixelHeight - 2 * oldCanvasDimensions.margin.y;
  const newDrawableWidth = newCanvasDimensions.pixelWidth - 2 * newCanvasDimensions.margin.x;
  const newDrawableHeight = newCanvasDimensions.pixelHeight - 2 * newCanvasDimensions.margin.y;

  return oldSegmentDisplay.map((segmentDisplay) => ({
    ...segmentDisplay,
    segmentGroupBounds: {
      x: Math.round((segmentDisplay.segmentGroupBounds.x - oldCanvasDimensions.margin.x) * newDrawableWidth / oldDrawableWidth + newCanvasDimensions.margin.x),
      y: Math.round((segmentDisplay.segmentGroupBounds.y - oldCanvasDimensions.margin.y) * newDrawableHeight / oldDrawableHeight + newCanvasDimensions.margin.y),
      width: Math.round(segmentDisplay.segmentGroupBounds.width * newDrawableWidth / oldDrawableWidth),
      height: Math.round(segmentDisplay.segmentGroupBounds.height * newDrawableHeight / oldDrawableHeight)
    },
    responseGroups: segmentDisplay.responseGroups.map((rg) => ({
      ...rg,
      bounds: {
        x: Math.round((rg.bounds.x - oldCanvasDimensions.margin.x) * newDrawableWidth / oldDrawableWidth + newCanvasDimensions.margin.x),
        y: Math.round((rg.bounds.y - oldCanvasDimensions.margin.y) * newDrawableHeight / oldDrawableHeight + newCanvasDimensions.margin.y),
        width: Math.round(rg.bounds.width * newDrawableWidth / oldDrawableWidth),
        height: Math.round(rg.bounds.height * newDrawableHeight / oldDrawableHeight)
      }
    }))
  }))
}