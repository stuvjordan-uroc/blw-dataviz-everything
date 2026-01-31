import { GridLabelsDisplay } from "shared-types";
import { CanvasData } from './types';
import { scaleLengthToCanvasX, scaleLengthToCanvasY, scalePositionToCanvas } from "./pointDisplayComputation";

/**
 * Scale grid labels from abstract visualization units to canvas pixel coordinates.
 * 
 * @param gridLabels - Grid labels in abstract viz units (from server data)
 * @param vizWidth - Width of visualization in abstract units
 * @param vizHeight - Height of visualization in abstract units
 * @param canvasData - Canvas dimensions and margin information
 * @returns Grid labels scaled to canvas pixel coordinates
 */
export function scaleGridLabelsToCanvas(
  gridLabels: GridLabelsDisplay,
  vizWidth: number,
  vizHeight: number,
  canvasData: CanvasData
): GridLabelsDisplay {
  return {
    columns: gridLabels.columns.map((col) => {
      const { x } = scalePositionToCanvas(col.x, 0, vizWidth, vizHeight, canvasData);
      return {
        responseGroupLabels: col.responseGroupLabels,
        x: x,
        width: scaleLengthToCanvasX(col.width, vizWidth, canvasData)
      };
    }),
    rows: gridLabels.rows.map((row) => {
      const { y } = scalePositionToCanvas(0, row.y, vizWidth, vizHeight, canvasData);
      return {
        responseGroupLabels: row.responseGroupLabels,
        y: y,
        height: scaleLengthToCanvasY(row.height, vizHeight, canvasData)
      };
    })
  };
}

/**
 * Rescale grid labels from old canvas dimensions to new canvas dimensions.
 * 
 * Used when canvas is resized to avoid recomputing from abstract units.
 * 
 * @param oldGridLabels - Grid labels scaled to old canvas dimensions
 * @param oldCanvasDimensions - Old canvas pixel dimensions and margin
 * @param newCanvasDimensions - New canvas pixel dimensions and margin
 * @returns Grid labels rescaled to new canvas dimensions
 */
export function rescaleGridLabelsDisplay(
  oldGridLabels: GridLabelsDisplay,
  oldCanvasDimensions: { pixelWidth: number, pixelHeight: number, margin: { x: number, y: number } },
  newCanvasDimensions: { pixelWidth: number, pixelHeight: number, margin: { x: number, y: number } }
): GridLabelsDisplay {
  const oldDrawableWidth = oldCanvasDimensions.pixelWidth - 2 * oldCanvasDimensions.margin.x;
  const oldDrawableHeight = oldCanvasDimensions.pixelHeight - 2 * oldCanvasDimensions.margin.y;
  const newDrawableWidth = newCanvasDimensions.pixelWidth - 2 * newCanvasDimensions.margin.x;
  const newDrawableHeight = newCanvasDimensions.pixelHeight - 2 * newCanvasDimensions.margin.y;

  return {
    columns: oldGridLabels.columns.map((col) => ({
      responseGroupLabels: col.responseGroupLabels,
      x: Math.round((col.x - oldCanvasDimensions.margin.x) * newDrawableWidth / oldDrawableWidth + newCanvasDimensions.margin.x),
      width: Math.round(col.width * newDrawableWidth / oldDrawableWidth)
    })),
    rows: oldGridLabels.rows.map((row) => ({
      responseGroupLabels: row.responseGroupLabels,
      y: Math.round((row.y - oldCanvasDimensions.margin.y) * newDrawableHeight / oldDrawableHeight + newCanvasDimensions.margin.y),
      height: Math.round(row.height * newDrawableHeight / oldDrawableHeight)
    }))
  };
}
