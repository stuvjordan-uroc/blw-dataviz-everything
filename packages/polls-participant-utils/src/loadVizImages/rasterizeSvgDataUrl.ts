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