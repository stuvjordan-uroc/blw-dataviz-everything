/**
 * Pure scaling functions for transforming abstract-unit coordinates to pixel coordinates.
 * 
 * These functions handle the presentation layer concern of mapping visualization
 * points from their abstract coordinate space (used by the server and state management)
 * to pixel coordinates for rendering on a specific canvas size.
 * 
 * This separation allows:
 * - State to remain canvas-agnostic (no state updates on resize)
 * - Same state to render at multiple scales simultaneously
 * - Resize events to trigger only re-rendering, not state recomputation
 * 
 * Exports:
 * - scalePointsToCanvas: Transform all points to pixel coordinates
 * - getAbstractBounds: Compute the bounding box of abstract coordinates
 * - scaleCoordinate: Scale a single coordinate value
 * - scaleLength: Scale a length/distance value
 */

import type { ParticipantPointPosition } from './types';

/**
 * Bounds of an abstract coordinate space.
 */
export interface AbstractBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Pixel coordinates for a single point.
 */
export interface PixelCoordinates {
  x: number;
  y: number;
}

/**
 * Point with pixel coordinates (for rendering).
 */
export interface PixelPointPosition {
  point: ParticipantPointPosition['point'];
  x: number;
  y: number;
}

/**
 * Options for scaling behavior.
 */
export interface ScalingOptions {
  /** Padding around the visualization (in pixels) */
  padding?: number;
  /** Whether to maintain aspect ratio (default: true) */
  maintainAspectRatio?: boolean;
  /** Alignment when aspect ratio creates extra space ('center' | 'top-left') */
  alignment?: 'center' | 'top-left';
}

/**
 * Scale abstract-unit coordinates to pixel coordinates for a canvas.
 * 
 * Strategy:
 * 1. Determine bounds of abstract coordinate space
 * 2. Calculate scale factors for x and y dimensions
 * 3. Apply padding and aspect ratio constraints
 * 4. Transform each point's coordinates
 * 
 * @param points - Points with abstract-unit coordinates
 * @param canvasWidth - Target canvas width in pixels
 * @param canvasHeight - Target canvas height in pixels
 * @param abstractBounds - Optional pre-computed bounds (auto-computed if not provided)
 * @param options - Scaling behavior options
 * @returns Points with pixel coordinates ready for rendering
 */
export function scalePointsToCanvas(
  points: ParticipantPointPosition[],
  canvasWidth: number,
  canvasHeight: number,
  abstractBounds?: AbstractBounds,
  options?: ScalingOptions
): PixelPointPosition[] {
  // TODO: Implement scaling logic
  // 1. Compute or use provided abstract bounds
  // 2. Calculate scale factors with padding
  // 3. Handle aspect ratio constraints
  // 4. Transform each point

  return points.map(pp => ({
    point: pp.point,
    x: 0, // Placeholder
    y: 0, // Placeholder
  }));
}

/**
 * Compute the bounding box of a set of points in abstract coordinates.
 * 
 * This is useful for:
 * - Pre-computing bounds to avoid recalculation on every scale operation
 * - Determining the extents of a visualization
 * - Calculating margins and padding
 * 
 * @param points - Points with abstract-unit coordinates
 * @returns Bounding box encompassing all points
 */
export function getAbstractBounds(
  points: ParticipantPointPosition[]
): AbstractBounds {
  // TODO: Implement bounds calculation
  // Handle empty array case
  // Find min/max for x and y

  if (points.length === 0) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  }

  return {
    minX: 0, // Placeholder
    maxX: 1, // Placeholder
    minY: 0, // Placeholder
    maxY: 1, // Placeholder
  };
}

/**
 * Scale a single coordinate value from abstract space to pixel space.
 * 
 * Linear interpolation from [abstractMin, abstractMax] to [0, pixelSize].
 * 
 * @param abstractValue - The abstract coordinate value to scale
 * @param abstractMin - Minimum of the abstract range
 * @param abstractMax - Maximum of the abstract range
 * @param pixelSize - Size of the pixel range
 * @param padding - Optional padding in pixels to apply
 * @returns Scaled pixel coordinate
 */
export function scaleCoordinate(
  abstractValue: number,
  abstractMin: number,
  abstractMax: number,
  pixelSize: number,
  padding: number = 0
): number {
  // TODO: Implement linear interpolation
  // Handle edge cases (abstractMin === abstractMax)
  // Apply padding

  return 0; // Placeholder
}

/**
 * Scale a length or distance value from abstract units to pixels.
 * 
 * Unlike scaleCoordinate, this scales a distance rather than a position,
 * so it doesn't need min/max bounds - just the scale factor.
 * 
 * Useful for:
 * - Scaling point radii
 * - Scaling line widths
 * - Scaling spacing values
 * 
 * @param abstractLength - The length in abstract units
 * @param abstractRange - The range of the abstract space
 * @param pixelRange - The range of the pixel space
 * @returns Scaled length in pixels
 */
export function scaleLength(
  abstractLength: number,
  abstractRange: number,
  pixelRange: number
): number {
  // TODO: Implement proportional scaling
  // Handle zero range case

  if (abstractRange === 0) return 0;

  return 0; // Placeholder
}

/**
 * Calculate the scale factor to fit abstract bounds into pixel dimensions
 * while maintaining aspect ratio.
 * 
 * @param abstractBounds - Bounds of the abstract space
 * @param canvasWidth - Target canvas width
 * @param canvasHeight - Target canvas height
 * @param padding - Padding in pixels
 * @returns Uniform scale factor to apply to both dimensions
 */
export function calculateUniformScale(
  abstractBounds: AbstractBounds,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 0
): number {
  // TODO: Implement uniform scale calculation
  // Calculate available space after padding
  // Compare aspect ratios
  // Return limiting scale factor

  return 1; // Placeholder
}
