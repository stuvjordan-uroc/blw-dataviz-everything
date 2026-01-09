import { SplitWithSegmentGroup } from "shared-types";
import { CanvasData } from "../types";
import { PointDisplay, PointLoadedImage } from "../../types";
import { pointKey } from "../../utils";

export function computeSingleSplitTVS(
  split: SplitWithSegmentGroup,
  displayMode: "expanded" | "collapsed",
  loadedImages: Map<string, PointLoadedImage>,
  canvasData: CanvasData
): Map<string, PointDisplay> {

  const mapToReturn: Map<string, PointDisplay> = new Map();

  for (const responseGroup of split.responseGroups[displayMode]) {
    const loadedImage = loadedImages.get(responseGroup.pointImage.svgDataURL)
    if (loadedImage) {
      for (const point of responseGroup.pointPositions) {
        mapToReturn.set(
          pointKey(point.point),
          {
            image: loadedImage,
            key: pointKey(point.point),
            position: {
              x: Math.round(canvasData.pixelWidth * (responseGroup.bounds.x + point.x) / split.segmentGroupBounds.width),
              y: Math.round(canvasData.pixelHeight * (responseGroup.bounds.y + point.y) / split.segmentGroupBounds.height)
            },
            point: point.point
          }
        )
      }
    }
  }

  return mapToReturn
}