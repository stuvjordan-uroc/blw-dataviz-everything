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
        // point.x/y are relative to segment origin (0,0).
        // Add responseGroup.bounds.x/y to get position relative to segment group origin,
        // then scale from segment group coordinate space to canvas pixels.
        const absX = point.x + responseGroup.bounds.x;
        const absY = point.y + responseGroup.bounds.y;
        const canvasX = Math.round(drawableWidth * absX / split.segmentGroupBounds.width) + canvasData.margin.x;
        const canvasY = Math.round(drawableHeight * absY / split.segmentGroupBounds.height) + canvasData.margin.y;

        mapToReturn.set(
          pointKey(point.point),
          {
            image: loadedImage,
            key: pointKey(point.point),
            position: {
              x: canvasX,
              y: canvasY
            },
            point: point.point
          }
        )
      }
    }
  }

  return mapToReturn
}