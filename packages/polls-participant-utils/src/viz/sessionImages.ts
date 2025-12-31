/**
 * Session image loading utilities.
 * 
 * Handles conversion of SVG data URLs from the server into rasterized
 * HTMLImageElements ready for canvas rendering.
 */

import type { VisualizationData } from 'shared-types';

/**
 * Convert an SVG data URL to an HTMLImageElement with rasterized PNG content.
 * 
 * Process:
 * 1. Load SVG data URL into an Image element
 * 2. Draw to canvas to rasterize
 * 3. Extract as PNG data URL
 * 4. Create final Image element with PNG data
 * 
 * This ensures optimal canvas rendering performance compared to drawing SVGs directly.
 * 
 * @param svgDataUrl - SVG data URL from server (e.g., "data:image/svg+xml;base64,...")
 * @returns Promise resolving to HTMLImageElement with rasterized PNG
 */
export async function rasterizeSvgDataUrl(svgDataUrl: string): Promise<HTMLImageElement> {
  // Step 1: Load the SVG into an image
  const svgImage = new Image();

  // Wait for SVG to load
  await new Promise<void>((resolve, reject) => {
    svgImage.onload = () => resolve();
    svgImage.onerror = () => reject(new Error(`Failed to load SVG: ${svgDataUrl.substring(0, 50)}...`));
    svgImage.src = svgDataUrl;
  });

  // Step 2: Create canvas and draw SVG to rasterize
  const canvas = document.createElement('canvas');
  canvas.width = svgImage.width;
  canvas.height = svgImage.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2d context from canvas');
  }

  ctx.drawImage(svgImage, 0, 0);

  // Step 3: Convert canvas to PNG data URL
  const pngDataUrl = canvas.toDataURL('image/png');

  // Step 4: Create final image element with PNG data
  const pngImage = new Image();

  await new Promise<void>((resolve, reject) => {
    pngImage.onload = () => resolve();
    pngImage.onerror = () => reject(new Error('Failed to create PNG image from canvas'));
    pngImage.src = pngDataUrl;
  });

  return pngImage;
}

/**
 * Load and rasterize all unique images from session visualization data.
 * 
 * Extracts all unique SVG data URLs and their offsets from all splits (both expanded 
 * and collapsed response groups) across all visualizations, rasterizes them in parallel, 
 * and returns a map for O(1) lookup.
 * 
 * @param visualizations - Array of visualization data from session
 * @returns Promise resolving to Map of SVG data URL → {image, offsetToCenter}
 */
export async function loadAllSessionImages(
  visualizations: VisualizationData[]
): Promise<Map<string, { image: HTMLImageElement; offsetToCenter: { x: number; y: number } }>> {
  // Step 1: Extract all unique SVG data URLs with their offsets
  const imageDataMap = new Map<string, { x: number; y: number }>();

  for (const viz of visualizations) {
    for (const split of viz.splits) {
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
  }

  // Step 2: Rasterize all unique URLs in parallel
  const imageEntries = await Promise.all(
    Array.from(imageDataMap.entries()).map(async ([url, offsetToCenter]) => {
      const image = await rasterizeSvgDataUrl(url);
      return [url, { image, offsetToCenter }] as const;
    })
  );

  // Step 3: Build and return the map
  return new Map(imageEntries);
}
