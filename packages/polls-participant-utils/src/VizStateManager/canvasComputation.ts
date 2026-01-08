/**
 * Canvas dimension computation utilities for VizStateManager
 */

import { SplitWithSegmentGroup } from "shared-types";
import { Filter, VizData, VizLogicalState } from "./types";






/**
 * Computes pixel width and pixel height for canvas to match given aspect ratio.
 * 
 * Shims the requested width to guarantee that computed pixel width and height are 
 * each greater than or equal to 1.
 * 
 * Returned width and height are in whole numbers.
 * 
 * @param requestedWidth - The desired canvas width in pixels
 * @param aspectRatio - Height/width ratio (vizHeight / vizWidth)
 * @returns Object containing shimmed pixel width and height
 * 
 * @example
 * // For a viz with 800x600 dimensions (aspect ratio = 0.75):
 * computeCanvasPixelDimensions(400, 0.75)
 * // Returns: { shimmedPixelWidth: 400, shimmedPixelHeight: 300 }
 */
export function computeCanvasPixelDimensions(
  requestedWidth: number,
  aspectRatio: number
): { shimmedPixelWidth: number; shimmedPixelHeight: number } {
  /**
   * Given the input width, we would compute pixelWidth
   * and pixelHeight with no shim as follows:
   * 
   * pixelWidth = Math.round(width)
   * pixelHeight = Math.round(Math.round(width) * aspectRatio)
   * 
   * But this could result in a pixelHeight or pixelWidth less than 1!
   * 
   * So we shim as follows...
   */

  /**
   * Find the minimum value of RPW (rounded pixel width) such that
   * 
   * Math.round(RPW * aspectRatio) >= 1
   * 
   * A sufficient condition is RPW * aspectRatio >= 1
   * 
   * Thus RPW >= 1/aspectRatio
   */

  const minRPW = 1 / aspectRatio;

  /**
   * If pixelWidth >= minRPW, then computed pixelHeight is 
   * guaranteed to be at least 1.
   * 
   * So we just need to set pixelWidth to a whole number
   * greater than or equal to the larger of minRPW and 1 
   */

  const pixelWidth =
    Math.round(requestedWidth) >= Math.max(minRPW, 1)
      ? Math.round(requestedWidth)
      : Math.ceil(Math.max(minRPW, 1));

  const pixelHeight = Math.round(pixelWidth * aspectRatio);

  return { shimmedPixelWidth: pixelWidth, shimmedPixelHeight: pixelHeight };
}
