/**
 * Helper utilities for generating circle images as SVG data URLs.
 * These images will be rasterized to PNG on the client side for optimal canvas rendering.
 */

import { interpolateLab } from "d3-interpolate";
import { PointImage } from "shared-types";

/**
 * Options for generating a circle image.
 */
export interface CircleImageOptions {
  /** Radius of the circle in pixels */
  radius: number;

  /** Fill color as hex code (e.g., '#1a3a52') */
  fillColor: string;

  /** Fill opacity (0-1). Default: 0.65 */
  fillOpacity?: number;

  /** Stroke color as hex code. Default: '#000000' (black) */
  strokeColor?: string;

  /** Stroke opacity (0-1). Default: 0.65 */
  strokeOpacity?: number;

  /** Stroke width in pixels. Default: 1 */
  strokeWidth?: number;
}

/**
 * Generate a circle image as an SVG data URL.
 *
 * @param options - Circle appearance options
 * @returns Base64-encoded SVG data URL
 */
export function generateCircleImage(options: CircleImageOptions): string {
  const {
    radius,
    fillColor,
    fillOpacity = 0.65,
    strokeColor = "#000000",
    strokeOpacity = 0.65,
    strokeWidth = 1,
  } = options;

  // Calculate canvas size: diameter plus stroke width padding
  const diameter = radius * 2 + strokeWidth * 2;
  const center = diameter / 2;

  // Generate SVG markup
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}">
  <circle cx="${center}" cy="${center}" r="${radius}" fill="${fillColor}" fill-opacity="${fillOpacity}" stroke="${strokeColor}" stroke-opacity="${strokeOpacity}" stroke-width="${strokeWidth}" />
</svg>`;

  // Encode to base64 using Node.js Buffer
  const base64 = Buffer.from(svg, "utf-8").toString("base64");

  return `data:image/svg+xml;base64,${base64}`;
}

export interface PointImageForResponseGroupProps {
  colorRange: [string, string];
  responseGroupIndex: number;
  numResponseGroups: number;
  circleRadius: number;
}

/**
 * Generate a PointImage for a response group by interpolating color from a range.
 * 
 * @param colorRange - The [startColor, endColor] range to interpolate from
 * @param responseGroupIndex - Index of this response group (0-based)
 * @param numResponseGroups - Total number of response groups
 * @param circleRadius - Radius of the circle in pixels
 * @returns PointImage with SVG data URL and offset to center
 */
export function pointImageForResponseGroup({
  colorRange,
  responseGroupIndex,
  numResponseGroups,
  circleRadius
}: PointImageForResponseGroupProps): PointImage {
  const fillColor = interpolateFromColorRange(colorRange, responseGroupIndex, numResponseGroups);
  const svgDataURL = generateCircleImage({
    radius: circleRadius,
    fillColor
  });

  // Offset to center is half the total diameter (radius + stroke width padding)
  const strokeWidth = 1; // default stroke width
  const diameter = circleRadius * 2 + strokeWidth * 2;
  const offsetToCenter = {
    x: diameter / 2,
    y: diameter / 2
  };

  return {
    svgDataURL,
    offsetToCenter
  };
}

/**
 * Interpolate a color from a range based on position.
 * Uses Lab color space for perceptually uniform interpolation.
 * 
 * @param range - The [startColor, endColor] range as hex strings (e.g., ['#ff0000', '#0000ff'])
 * @param responseGroupIndex - Index of this response group (0-based)
 * @param numResponseGroups - Total number of response groups
 * @returns Interpolated color as hex string
 */
export function interpolateFromColorRange(
  range: [string, string],
  responseGroupIndex: number,
  numResponseGroups: number
): string {
  const [startColor, endColor] = range;

  // Handle edge cases
  if (numResponseGroups === 1) {
    return startColor;
  }

  // Calculate interpolation factor (0 to 1)
  const t = responseGroupIndex / (numResponseGroups - 1);

  // Use d3-interpolate's Lab interpolation for perceptually uniform colors
  const interpolator = interpolateLab(startColor, endColor);
  return interpolator(t);
}