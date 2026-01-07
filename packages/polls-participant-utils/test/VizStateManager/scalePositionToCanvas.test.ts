import { scalePositionToCanvas } from '../../src/VizStateManager/pointDisplayComputation';
import { VizData, CanvasData } from '../../src/VizStateManager/types';
import { createMockVisualizationData } from './fixtures';
import { MockHTMLCanvasElement } from './mocks';

describe('scalePositionToCanvas', () => {
  const mockVizData = createMockVisualizationData({ vizWidth: 1000, vizHeight: 800 });
  const vizData: VizData = {
    ...mockVizData,
    loadedImages: new Map(),
  };

  const mockCanvas = new MockHTMLCanvasElement();
  mockCanvas.width = 400;
  mockCanvas.height = 320;
  const canvasData: CanvasData = {
    element: mockCanvas as any,
    context: mockCanvas.getContext('2d') as any,
    pixelWidth: 400,
    pixelHeight: 320,
  };

  it('should scale abstract position to canvas coordinates', () => {
    // vizWidth 1000 -> pixelWidth 400 (x ratio: 0.4)
    // vizHeight 800 -> pixelHeight 320 (y ratio: 0.4)
    // abstractX 250 -> canvasX 100
    // abstractY 200 -> canvasY 80
    const result = scalePositionToCanvas(250, 200, vizData, canvasData);
    expect(result).toEqual({ x: 100, y: 80 });
  });

  it('should round both x and y to nearest integer', () => {
    // abstractX 127 -> 50.8 -> 51
    // abstractY 127 -> 50.8 -> 51
    const result = scalePositionToCanvas(127, 127, vizData, canvasData);
    expect(result).toEqual({ x: 51, y: 51 });
  });

  it('should round down when fractional part is less than 0.5', () => {
    // abstractX 123 -> 49.2 -> 49
    // abstractY 123 -> 49.2 -> 49
    const result = scalePositionToCanvas(123, 123, vizData, canvasData);
    expect(result).toEqual({ x: 49, y: 49 });
  });

  it('should round up when fractional part is 0.5 or greater', () => {
    // abstractX 128 -> 51.2 -> 51
    // abstractY 128 -> 51.2 -> 51
    const result = scalePositionToCanvas(128, 128, vizData, canvasData);
    expect(result).toEqual({ x: 51, y: 51 });
  });

  it('should handle origin (0, 0)', () => {
    const result = scalePositionToCanvas(0, 0, vizData, canvasData);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('should handle maximum coordinates', () => {
    // vizWidth 1000 -> pixelWidth 400
    // vizHeight 800 -> pixelHeight 320
    const result = scalePositionToCanvas(1000, 800, vizData, canvasData);
    expect(result).toEqual({ x: 400, y: 320 });
  });

  it('should handle fractional abstract positions', () => {
    // abstractX 50.5 -> 20.2 -> 20
    // abstractY 100.5 -> 40.2 -> 40
    const result = scalePositionToCanvas(50.5, 100.5, vizData, canvasData);
    expect(result).toEqual({ x: 20, y: 40 });
  });

  it('should handle very small canvas', () => {
    const smallMockCanvas = new MockHTMLCanvasElement();
    smallMockCanvas.width = 10;
    smallMockCanvas.height = 8;
    const smallCanvas: CanvasData = {
      element: smallMockCanvas as any,
      context: smallMockCanvas.getContext('2d') as any,
      pixelWidth: 10,
      pixelHeight: 8,
    };
    // abstractX 100 -> 1 pixel (100 * 0.01 = 1)
    // abstractY 100 -> 1 pixel (100 * 0.01 = 1)
    const result = scalePositionToCanvas(100, 100, vizData, smallCanvas);
    expect(result).toEqual({ x: 1, y: 1 });
  });

  it('should handle asymmetric scaling', () => {
    const asymmetricMockCanvas = new MockHTMLCanvasElement();
    asymmetricMockCanvas.width = 500;
    asymmetricMockCanvas.height = 200;
    const asymmetricCanvas: CanvasData = {
      element: asymmetricMockCanvas as any,
      context: asymmetricMockCanvas.getContext('2d') as any,
      pixelWidth: 500,
      pixelHeight: 200,
    };
    // abstractX 200 -> 100 (200 * 0.5 = 100)
    // abstractY 200 -> 50 (200 * 0.25 = 50)
    const result = scalePositionToCanvas(200, 200, vizData, asymmetricCanvas);
    expect(result).toEqual({ x: 100, y: 50 });
  });

  it('should independently round x and y coordinates', () => {
    // abstractX 126 -> 50.4 -> 50
    // abstractY 128 -> 51.2 -> 51
    const result = scalePositionToCanvas(126, 128, vizData, canvasData);
    expect(result).toEqual({ x: 50, y: 51 });
  });
});
