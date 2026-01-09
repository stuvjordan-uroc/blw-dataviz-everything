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
  const scaledSegmentGroupBounds = {
    x: 0,
    y: 0,
    width: canvasData.pixelWidth,
    height: canvasData.pixelHeight
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
          x: Math.round(canvasData.pixelWidth * restOfRg.bounds.x / restOfSplit.segmentGroupBounds.width),
          y: Math.round(canvasData.pixelHeight * restOfRg.bounds.y / restOfSplit.segmentGroupBounds.height),
          width: Math.round(canvasData.pixelWidth * restOfRg.bounds.width / restOfSplit.segmentGroupBounds.width),
          height: Math.round(canvasData.pixelHeight * restOfRg.bounds.height / restOfSplit.segmentGroupBounds.height)
        }
      })
    })
  })
}