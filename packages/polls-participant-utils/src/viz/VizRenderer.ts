/**
 * VizRenderer: Canvas-based renderer for participant visualizations.
 * 
 * This class encapsulates an HTMLCanvasElement and provides methods for
 * drawing and animating visualization states.
 * 
 * Auto-subscribes to SessionVizClient for state updates and handles
 * rendering automatically.
 */

import type { VisualizationData, Point } from 'shared-types';
import type {
  VizRendererConfig,
  VizRendererState,
  ParticipantPointPositions,
  ViewState,
  PointImage
} from './types';
import { computeCanvasHeight, scalePoint } from './scaling';

export class VizRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private vizData: VisualizationData;
  private visualizationId: string;
  private canvasPixelWidth: number;
  private canvasPixelHeight: number;
  private currentPositions: ParticipantPointPositions;
  private config: VizRendererConfig;
  private viewState: ViewState;
  private unsubscribe: (() => void) | null = null;

  constructor(config: VizRendererConfig) {
    this.config = config;
    this.canvas = config.canvas;
    this.visualizationId = config.visualizationId;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context from canvas');
    }
    this.ctx = ctx;

    // Get visualization data from client
    const sessionData = config.client.getSessionData();
    if (!sessionData) {
      throw new Error('SessionVizClient is not connected');
    }

    const vizData = sessionData.visualizations.find(v => v.visualizationId === config.visualizationId);
    if (!vizData) {
      throw new Error(`Visualization ${config.visualizationId} not found in session`);
    }
    this.vizData = vizData;

    // Initialize canvas dimensions (will be set properly on first draw)
    this.canvasPixelWidth = 0;
    this.canvasPixelHeight = 0;

    // Validate config
    if (!this.config.getImage && !(this.config.getImageKey && this.config.images)) {
      throw new Error('VizRendererConfig must provide either getImage or (getImageKey + images)');
    }

    // Auto-subscribe to state updates
    // Callback fires immediately with current state, then on future updates
    this.unsubscribe = config.client.subscribeToVizState((vizId, result) => {
      if (vizId === this.visualizationId) {
        // Query current ViewState (needed for image selection)
        const newViewState = config.client.getViewState(vizId);
        if (!newViewState) {
          throw new Error(`ViewState not found for visualization ${vizId} - client may be disconnected`);
        }
        this.viewState = newViewState;
        this.currentPositions = result.endState;

        // Set canvas dimensions if not yet set (first callback only)
        if (this.canvasPixelWidth === 0) {
          this.setCanvasWidth(config.canvasWidth);
        } else {
          // Subsequent updates just redraw
          this.drawCurrentPointPositions();
        }
      }
    });
    // Note: At this point, callback has already fired and canvas is drawn
  }

  /**
   * Clean up resources and unsubscribe from client.
   * Should be called when the renderer is no longer needed.
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
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
   * Get image data for a specific point, applying default offsets if needed.
   * 
   * @param point - The point to get image data for
   * @returns PointImage with image and offsets (defaults applied)
   */
  private getImageForPoint(point: Point): PointImage {
    let pointImage: PointImage;

    if (this.config.getImageKey && this.config.images) {
      // Key-based lookup (preferred if both methods provided)
      const key = this.config.getImageKey(point, this.viewState);
      const imageData = this.config.images.get(key);
      if (!imageData) {
        throw new Error(`No image found for key: ${key}`);
      }
      pointImage = imageData;
    } else if (this.config.getImage) {
      // Direct function
      pointImage = this.config.getImage(point, this.viewState);
    } else {
      throw new Error('Invalid config state');
    }

    // Apply defaults for offsets if not specified
    return {
      image: pointImage.image,
      offsetX: pointImage.offsetX ?? pointImage.image.width / 2,
      offsetY: pointImage.offsetY ?? pointImage.image.height / 2,
    };
  }

  /**
   * Draw the current point positions on the canvas.
   * Scales abstract coordinates to pixels and renders each point's image.
   */
  private drawCurrentPointPositions(): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvasPixelWidth, this.canvasPixelHeight);

    // Draw each point
    for (const position of this.currentPositions.values()) {
      // Scale abstract coordinates to pixels
      const { x: pixelX, y: pixelY } = scalePoint(
        position.x,
        position.y,
        this.vizData.vizWidth,
        this.vizData.vizHeight,
        this.canvasPixelWidth,
        this.canvasPixelHeight
      );

      // Get image and offsets for this point
      const { image, offsetX, offsetY } = this.getImageForPoint(position.point);

      // Draw image centered on the point
      this.ctx.drawImage(
        image,
        pixelX - offsetX!,
        pixelY - offsetY!
      );
    }
  }
}
