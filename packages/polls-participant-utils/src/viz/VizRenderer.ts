/**
 * VizRenderer: Canvas-based renderer for participant visualizations.
 * 
 * This class encapsulates an HTMLCanvasElement and provides methods for
 * drawing and animating visualization states.
 */

import type { VisualizationData } from 'shared-types';
import type { VizRendererConfig, VizRendererState, ParticipantPointPositions } from './types';
import { computeCanvasHeight } from './scaling';

export class VizRenderer {
  private canvas: HTMLCanvasElement;
  private vizData: VisualizationData;
  private canvasPixelWidth: number;
  private canvasPixelHeight: number;
  private currentPositions: ParticipantPointPositions;

  constructor(
    canvas: HTMLCanvasElement,
    canvasWidth: number,
    vizData: VisualizationData,
    initialPositions: ParticipantPointPositions
  ) {
    this.canvas = canvas;
    this.vizData = vizData;
    this.currentPositions = initialPositions;
    this.canvasPixelWidth = 0;
    this.canvasPixelHeight = 0;

    // Set initial canvas dimensions
    this.setCanvasWidth(canvasWidth);
  }

  /**
   * Set canvas width and compute/set height to maintain aspect ratio.
   * Mutates the canvas element's width and height properties.
   * Browser automatically clears the canvas when dimensions change,
   * so we redraw the current state.
   * 
   * @param width - Desired canvas width in pixels
   */
  setCanvasWidth(width: number): void {
    this.canvasPixelWidth = width;
    this.canvasPixelHeight = computeCanvasHeight(
      this.vizData.vizWidth,
      this.vizData.vizHeight,
      width
    );

    // Mutate canvas dimensions (browser auto-clears)
    this.canvas.width = this.canvasPixelWidth;
    this.canvas.height = this.canvasPixelHeight;

    // Redraw current state
    this.drawCurrentPointPositions();
  }

  /**
   * Draw the current point positions on the canvas.
   * TODO: Implement actual drawing logic
   */
  private drawCurrentPointPositions(): void {
    // TODO: Implement drawing
  }
}
