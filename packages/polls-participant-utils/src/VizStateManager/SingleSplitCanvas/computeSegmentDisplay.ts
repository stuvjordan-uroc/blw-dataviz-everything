import { SplitWithSegmentGroup } from "shared-types";
import { CanvasData, SegmentGroupDisplay } from "../types";

export function computeSingleSplitSegmentDisplay(
  split: SplitWithSegmentGroup,
  displayMode: "expanded" | "collapsed",
  canvasData: CanvasData
): SegmentGroupDisplay {

  //remove the points and response groups from the split
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { points, responseGroups, ...restOfSplit } = split;

  //calculate drawable area (canvas minus margins)
  const drawableWidth = canvasData.pixelWidth - 2 * canvasData.margin.x;
  const drawableHeight = canvasData.pixelHeight - 2 * canvasData.margin.y;

  //set the segmentGroup bounds to drawable area
  const scaledSegmentGroupBounds = {
    x: canvasData.margin.x,
    y: canvasData.margin.y,
    width: drawableWidth,
    height: drawableHeight
  }

  return ({
    ...restOfSplit,
    segmentGroupBounds: scaledSegmentGroupBounds,
    responseGroups: responseGroups[displayMode].map((rg) => {
      //remove the point positions and point image
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pointPositions, pointImage, ...restOfRg } = rg;
      return ({
        ...restOfRg,
        bounds: {
          x: Math.round(drawableWidth * restOfRg.bounds.x / restOfSplit.segmentGroupBounds.width) + canvasData.margin.x,
          y: Math.round(drawableHeight * restOfRg.bounds.y / restOfSplit.segmentGroupBounds.height) + canvasData.margin.y,
          width: Math.round(drawableWidth * restOfRg.bounds.width / restOfSplit.segmentGroupBounds.width),
          height: Math.round(drawableHeight * restOfRg.bounds.height / restOfSplit.segmentGroupBounds.height)
        }
      })
    })
  })
}