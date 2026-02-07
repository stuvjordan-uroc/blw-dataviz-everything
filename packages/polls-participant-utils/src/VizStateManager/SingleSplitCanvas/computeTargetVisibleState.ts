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

  //calculate drawable area (canvas minus margins)
  const drawableWidth = canvasData.pixelWidth - 2 * canvasData.margin.x;
  const drawableHeight = canvasData.pixelHeight - 2 * canvasData.margin.y;

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
              // point.x and point.y are already absolute coordinates relative to segmentGroupBounds
              // so we don't add responseGroup.bounds.x/y (that would double-count the segment position)
              x: Math.round(drawableWidth * point.x / split.segmentGroupBounds.width) + canvasData.margin.x,
              y: Math.round(drawableHeight * point.y / split.segmentGroupBounds.height) + canvasData.margin.y
            },
            point: point.point
          }
        )
      }
    }
  }

  return mapToReturn
}