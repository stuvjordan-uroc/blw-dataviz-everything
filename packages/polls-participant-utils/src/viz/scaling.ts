/**
 * Scaling utilities for converting abstract coordinate units to pixel coordinates.
 * 
 * The server sends all coordinates and dimensions in abstract units. These functions
 * handle the transformation to pixel coordinates for canvas rendering.
 * 
 * Coordinate system:
 * - Abstract units: Computed by server based on SegmentVizConfig parameters
 * - Pixel units: Actual canvas rendering coordinates
 * - Scaling maintains aspect ratio: vizWidth:vizHeight = canvasWidth:canvasHeight
 * 
 * Exports:
 * - computeCanvasHeight: Calculate pixel height from pixel width + aspect ratio
 * - scalePoint: Convert abstract x,y to pixel x,y
 * - scaleXLength: Convert abstract x-axis length to pixels
 * - scaleYLength: Convert abstract y-axis length to pixels
 * - scalePointPosition: Helper for ParticipantPointPosition objects
 * - scalePointPositionChange: Helper for PointPositionChange objects
 */

import type { ParticipantPointPosition, PointPositionChange } from './types';

/**
 * Compute canvas height in pixels to match aspect ratio of abstract dimensions.
 * 
 * Given a desired canvas width in pixels, computes the height needed to maintain
 * the same aspect ratio as the abstract coordinate system.
 * 
 * @param vizWidth - Canvas width in abstract units
 * @param vizHeight - Canvas height in abstract units
 * @param canvasWidth - Desired canvas width in pixels
 * @returns Canvas height in pixels (rounded to whole number)
 * 
 * @example
 * const height = computeCanvasHeight(800, 600, 1000);
 * // height = 750 (maintains 4:3 aspect ratio)
 */
export function computeCanvasHeight(
  vizWidth: number,
  vizHeight: number,
  canvasWidth: number
): number {
  return Math.round((vizHeight / vizWidth) * canvasWidth);
}

/**
 * Scale abstract coordinates to pixel coordinates.
 * 
 * Converts a point from abstract coordinate space to pixel coordinate space
 * for canvas rendering. Results are rounded to whole pixel values.
 * 
 * @param x - X coordinate in abstract units
 * @param y - Y coordinate in abstract units
 * @param vizWidth - Canvas width in abstract units
 * @param vizHeight - Canvas height in abstract units
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @returns Object with x and y in pixel coordinates
 * 
 * @example
 * const pixel = scalePoint(100, 50, 800, 600, 1000, 750);
 * // pixel = { x: 125, y: 63 }
 */
export function scalePoint(
  x: number,
  y: number,
  vizWidth: number,
  vizHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  return {
    x: Math.round((x / vizWidth) * canvasWidth),
    y: Math.round((y / vizHeight) * canvasHeight),
  };
}

/**
 * Scale an x-axis length from abstract units to pixels.
 * 
 * Converts a horizontal distance or width from abstract units to pixels.
 * Useful for scaling segment widths, gaps, etc.
 * 
 * @param length - Length in abstract units
 * @param vizWidth - Canvas width in abstract units
 * @param canvasWidth - Canvas width in pixels
 * @returns Length in pixels (rounded to whole number)
 * 
 * @example
 * const pixelWidth = scaleXLength(50, 800, 1000);
 * // pixelWidth = 63
 */
export function scaleXLength(
  length: number,
  vizWidth: number,
  canvasWidth: number
): number {
  return Math.round((length / vizWidth) * canvasWidth);
}

/**
 * Scale a y-axis length from abstract units to pixels.
 * 
 * Converts a vertical distance or height from abstract units to pixels.
 * Useful for scaling segment heights, gaps, etc.
 * 
 * @param length - Length in abstract units
 * @param vizHeight - Canvas height in abstract units
 * @param canvasHeight - Canvas height in pixels
 * @returns Length in pixels (rounded to whole number)
 * 
 * @example
 * const pixelHeight = scaleYLength(30, 600, 750);
 * // pixelHeight = 38
 */
export function scaleYLength(
  length: number,
  vizHeight: number,
  canvasHeight: number
): number {
  return Math.round((length / vizHeight) * canvasHeight);
}

/**
 * Scale a ParticipantPointPosition to pixel coordinates.
 * 
 * Helper function that preserves the point metadata while converting
 * coordinates to pixels. Returns a new object; does not mutate input.
 * 
 * @param position - Point position in abstract coordinates
 * @param vizWidth - Canvas width in abstract units
 * @param vizHeight - Canvas height in abstract units
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @returns New ParticipantPointPosition with pixel coordinates
 * 
 * @example
 * const abstractPos = { point: {id: 1, ...}, x: 100, y: 50 };
 * const pixelPos = scalePointPosition(abstractPos, 800, 600, 1000, 750);
 * // pixelPos = { point: {id: 1, ...}, x: 125, y: 63 }
 */
export function scalePointPosition(
  position: ParticipantPointPosition,
  vizWidth: number,
  vizHeight: number,
  canvasWidth: number,
  canvasHeight: number
): ParticipantPointPosition {
  const scaled = scalePoint(position.x, position.y, vizWidth, vizHeight, canvasWidth, canvasHeight);
  return {
    point: position.point,
    x: scaled.x,
    y: scaled.y,
  };
}

/**
 * Scale a PointPositionChange to pixel coordinates.
 * 
 * Helper function for animation that converts all position values
 * (from, to, and delta) to pixel coordinates. Returns a new object.
 * 
 * @param change - Point position change in abstract coordinates
 * @param vizWidth - Canvas width in abstract units
 * @param vizHeight - Canvas height in abstract units
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @returns New PointPositionChange with pixel coordinates
 * 
 * @example
 * const abstractChange = {
 *   point: {id: 1, ...},
 *   fromX: 100, fromY: 50,
 *   toX: 150, toY: 75,
 *   dx: 50, dy: 25
 * };
 * const pixelChange = scalePointPositionChange(abstractChange, 800, 600, 1000, 750);
 */
export function scalePointPositionChange(
  change: PointPositionChange,
  vizWidth: number,
  vizHeight: number,
  canvasWidth: number,
  canvasHeight: number
): PointPositionChange {
  const from = scalePoint(change.fromX, change.fromY, vizWidth, vizHeight, canvasWidth, canvasHeight);
  const to = scalePoint(change.toX, change.toY, vizWidth, vizHeight, canvasWidth, canvasHeight);

  return {
    point: change.point,
    fromX: from.x,
    fromY: from.y,
    toX: to.x,
    toY: to.y,
    dx: to.x - from.x,
    dy: to.y - from.y,
  };
}
