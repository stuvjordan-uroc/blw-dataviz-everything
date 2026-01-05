import { SplitWithSegmentGroup } from "shared-types";
import { PointLoadedImage } from "../types";
import { rasterizeSvgDataUrl } from "./rasterizeSvgDataUrl";

export async function loadVizImages(splits: SplitWithSegmentGroup[]): Promise<Map<string, PointLoadedImage>> {

  //Step 1: Extract all unique SVG data URLs with their offsets
  const imageDataMap = new Map<string, { x: number; y: number }>();
  for (const split of splits) {
    // Extract from expanded response groups
    for (const responseGroup of split.responseGroups.expanded) {
      const { svgDataURL, offsetToCenter } = responseGroup.pointImage;
      if (!imageDataMap.has(svgDataURL)) {
        imageDataMap.set(svgDataURL, offsetToCenter);
      }
    }

    // Extract from collapsed response groups
    for (const responseGroup of split.responseGroups.collapsed) {
      const { svgDataURL, offsetToCenter } = responseGroup.pointImage;
      if (!imageDataMap.has(svgDataURL)) {
        imageDataMap.set(svgDataURL, offsetToCenter);
      }
    }
  }

  //Step 2: Rasterize all unique URLs in parallel
  const imageEntries = await Promise.all(
    Array.from(imageDataMap.entries()).map(async ([url, offsetToCenter]) => {
      const image = await rasterizeSvgDataUrl(url);
      return [url, { image, offsetToCenter }] as const;
    })
  );

  return new Map(imageEntries)

}

