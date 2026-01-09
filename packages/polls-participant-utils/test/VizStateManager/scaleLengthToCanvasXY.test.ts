import { scaleLengthToCanvasX, scaleLengthToCanvasY } from '../../src/VizStateManager/pointDisplayComputation';
import { VizData, CanvasData } from '../../src/VizStateManager/types';
import { createMockVisualizationData } from './fixtures';
import { MockHTMLCanvasElement } from './mocks';

describe('scaleLengthToCanvasX', () => {
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

  it('should scale a length to canvas X coordinates', () => {
    // vizWidth 1000 -> pixelWidth 400 (ratio: 0.4)
    // length 100 -> 40 pixels
    const result = scaleLengthToCanvasX(100, vizData.vizWidth, canvasData);
    expect(result).toBe(40);
  });

  it('should round the result to nearest integer', () => {
    // length 125 -> 50 pixels (125 * 0.4 = 50)
    const result = scaleLengthToCanvasX(125, vizData.vizWidth, canvasData);
    expect(result).toBe(50);
  });

  it('should round down when fractional part is less than 0.5', () => {
    // length 123 -> 49.2 -> 49 pixels
    const result = scaleLengthToCanvasX(123, vizData.vizWidth, canvasData);
    expect(result).toBe(49);
  });

  it('should round up when fractional part is 0.5 or greater', () => {
    // length 127 -> 50.8 -> 51 pixels
    const result = scaleLengthToCanvasX(127, vizData.vizWidth, canvasData);
    expect(result).toBe(51);
  });

  it('should handle zero length', () => {
    const result = scaleLengthToCanvasX(0, vizData.vizWidth, canvasData);
    expect(result).toBe(0);
  });

  it('should handle full width', () => {
    // vizWidth 1000 -> pixelWidth 400
    const result = scaleLengthToCanvasX(1000, vizData.vizWidth, canvasData);
    expect(result).toBe(400);
  });

  it('should handle fractional lengths', () => {
    // length 50.5 -> 20.2 -> 20 pixels
    const result = scaleLengthToCanvasX(50.5, vizData.vizWidth, canvasData);
    expect(result).toBe(20);
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
    // length 100 -> 1 pixel (100 * 0.01 = 1)
    const result = scaleLengthToCanvasX(100, vizData.vizWidth, smallCanvas);
    expect(result).toBe(1);
  });
});

describe('scaleLengthToCanvasY', () => {
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

  it('should scale a length to canvas Y coordinates', () => {
    // vizHeight 800 -> pixelHeight 320 (ratio: 0.4)
    // length 100 -> 40 pixels
    const result = scaleLengthToCanvasY(100, vizData.vizHeight, canvasData);
    expect(result).toBe(40);
  });

  it('should round the result to nearest integer', () => {
    // length 125 -> 50 pixels (125 * 0.4 = 50)
    const result = scaleLengthToCanvasY(125, vizData.vizHeight, canvasData);
    expect(result).toBe(50);
  });

  it('should round down when fractional part is less than 0.5', () => {
    // length 123 -> 49.2 -> 49 pixels
    const result = scaleLengthToCanvasY(123, vizData.vizHeight, canvasData);
    expect(result).toBe(49);
  });

  it('should round up when fractional part is 0.5 or greater', () => {
    // length 127 -> 50.8 -> 51 pixels
    const result = scaleLengthToCanvasY(127, vizData.vizHeight, canvasData);
    expect(result).toBe(51);
  });

  it('should handle zero length', () => {
    const result = scaleLengthToCanvasY(0, vizData.vizHeight, canvasData);
    expect(result).toBe(0);
  });

  it('should handle full height', () => {
    // vizHeight 800 -> pixelHeight 320
    const result = scaleLengthToCanvasY(800, vizData.vizHeight, canvasData);
    expect(result).toBe(320);
  });

  it('should handle fractional lengths', () => {
    // length 50.5 -> 20.2 -> 20 pixels
    const result = scaleLengthToCanvasY(50.5, vizData.vizHeight, canvasData);
    expect(result).toBe(20);
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
    // length 100 -> 1 pixel (100 * 0.01 = 1)
    const result = scaleLengthToCanvasY(100, vizData.vizHeight, smallCanvas);
    expect(result).toBe(1);
  });
});
