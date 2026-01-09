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
  oldCanvasDimensions: { pixelWidth: number, pixelHeight: number },
  newCanvasDimensions: { pixelWidth: number, pixelHeight: number }
): SegmentGroupDisplay[] {
  return oldSegmentDisplay.map((segmentDisplay) => ({
    ...segmentDisplay,
    segmentGroupBounds: {
      x: Math.round(newCanvasDimensions.pixelWidth * segmentDisplay.segmentGroupBounds.x / oldCanvasDimensions.pixelWidth),
      y: Math.round(newCanvasDimensions.pixelHeight * segmentDisplay.segmentGroupBounds.y / oldCanvasDimensions.pixelHeight),
      width: Math.round(newCanvasDimensions.pixelWidth * segmentDisplay.segmentGroupBounds.width / oldCanvasDimensions.pixelWidth),
      height: Math.round(newCanvasDimensions.pixelHeight * segmentDisplay.segmentGroupBounds.height / oldCanvasDimensions.pixelHeight)
    },
    responseGroups: segmentDisplay.responseGroups.map((rg) => ({
      ...rg,
      bounds: {
        x: Math.round(newCanvasDimensions.pixelWidth * rg.bounds.x / oldCanvasDimensions.pixelWidth),
        y: Math.round(newCanvasDimensions.pixelHeight * rg.bounds.y / oldCanvasDimensions.pixelHeight),
        width: Math.round(newCanvasDimensions.pixelWidth * rg.bounds.width / oldCanvasDimensions.pixelWidth),
        height: Math.round(newCanvasDimensions.pixelHeight * rg.bounds.height / oldCanvasDimensions.pixelHeight)
      }
    }))
  }))
}