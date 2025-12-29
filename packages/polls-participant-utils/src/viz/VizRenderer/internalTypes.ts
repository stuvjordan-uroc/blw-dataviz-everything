/**
 * Internal types for VizRenderer module.
 * 
 * These types are shared across VizRenderer components but are not
 * exposed to external consumers.
 */

import type { Point } from 'shared-types';
import type { StateChangeResult, PointImage } from '../types';

/**
 * Logical state - the "ground truth" from SessionVizClient.
 * This is what the visualization SHOULD show (the target).
 */
export interface LogicalState {
  /** Latest state change result from client */
  result: StateChangeResult;

  /** Visualization dimensions in abstract units (from vizData) */
  vizWidth: number;
  vizHeight: number;
}

/**
 * Visual state - what's currently rendered on screen.
 * During animation, this gradually transitions toward logical state.
 */
export interface VisualState {
  /** Current visual representation of each point */
  points: Map<string, VisualPointState>;
}

/**
 * Visual rendering state for a single point.
 * Includes position, opacity, and image(s) for rendering.
 */
export interface VisualPointState {
  point: Point;           // Point identity (for lookups)
  x: number;              // Current visual X position (may be mid-animation)
  y: number;              // Current visual Y position (may be mid-animation)
  opacity: number;        // Point opacity (0-1, for appear/disappear)

  // Current image to render
  image: PointImage;

  // Optional: for cross-fade during image transitions
  previousImage?: PointImage;
  imageCrossFadeProgress?: number; // 0 = show previousImage, 1 = show image
}

/**
 * Canvas infrastructure - rendering context and dimensions.
 */
export interface CanvasState {
  element: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  pixelWidth: number;
  pixelHeight: number;
}
