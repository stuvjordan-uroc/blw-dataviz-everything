import React, { useLayoutEffect, useRef } from "react";
import type { GridLabelsDisplay } from "shared-types";

/**
 * GridLabels - Renders row and column labels for the segment group grid
 *
 * Column labels:
 * - Centered horizontally on their column
 * - Bottom edge aligned to top edge of canvas
 *
 * Row labels:
 * - Centered vertically on their row
 * - Right edge aligned to left edge of canvas
 *
 * CSS Classes (for custom styling):
 * - .segment-grid-label-wrapper: All label wrappers
 * - .segment-grid-label-wrapper--column: Column label wrappers
 * - .segment-grid-label-wrapper--row: Row label wrappers
 */
export interface GridLabelsProps {
  /**
   * Pre-computed grid labels with geometry (in canvas pixel coordinates)
   */
  gridLabelsDisplay: GridLabelsDisplay;

  /**
   * Annotation margin offset that defines where the canvas starts
   */
  annotationMargin: { x: number; y: number };

  /**
   * Component to render column label content from response group labels
   */
  ColumnLabel: React.ComponentType<{ labels: string[] }>;

  /**
   * Component to render row label content from response group labels
   */
  RowLabel: React.ComponentType<{ labels: string[] }>;
}

export function GridLabels({
  gridLabelsDisplay,
  annotationMargin,
  ColumnLabel,
  RowLabel,
}: GridLabelsProps) {
  const columnLabelRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const rowLabelRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Center labels based on measured dimensions
  useLayoutEffect(() => {
    // Center column labels horizontally within their column
    // Bottom edge at top edge of canvas
    columnLabelRefs.current.forEach((labelDiv, columnIndex) => {
      const column = gridLabelsDisplay.columns[columnIndex];
      const labelWidth = labelDiv.offsetWidth;
      const labelHeight = labelDiv.offsetHeight;

      // Center horizontally on column
      const left = column.x + column.width / 2 - labelWidth / 2;
      // Bottom edge at top of canvas (annotationMargin.y)
      const top = annotationMargin.y - labelHeight;

      labelDiv.style.left = `${annotationMargin.x + left}px`;
      labelDiv.style.top = `${top}px`;
    });

    // Center row labels vertically within their row
    // Right edge at left edge of canvas
    rowLabelRefs.current.forEach((labelDiv, rowIndex) => {
      const row = gridLabelsDisplay.rows[rowIndex];
      const labelWidth = labelDiv.offsetWidth;
      const labelHeight = labelDiv.offsetHeight;

      // Right edge at left of canvas (annotationMargin.x)
      const left = annotationMargin.x - labelWidth;
      // Center vertically on row
      const top = row.y + row.height / 2 - labelHeight / 2;

      labelDiv.style.left = `${left}px`;
      labelDiv.style.top = `${annotationMargin.y + top}px`;
    });
  }, [gridLabelsDisplay, annotationMargin]);

  return (
    <>
      {/* Column labels */}
      {gridLabelsDisplay.columns.map((column, index) => (
        <div
          key={`col-${index}`}
          ref={(el) => {
            if (el) {
              columnLabelRefs.current.set(index, el);
            } else {
              columnLabelRefs.current.delete(index);
            }
          }}
          className="segment-grid-label-wrapper segment-grid-label-wrapper--column"
          style={{
            position: "absolute",
            // Initial positioning - will be adjusted by useLayoutEffect
            left: 0,
            top: 0,
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 3,
            zIndex: 3,
          }}
        >
          <ColumnLabel labels={column.responseGroupLabels} />
        </div>
      ))}

      {/* Row labels */}
      {gridLabelsDisplay.rows.map((row, index) => (
        <div
          key={`row-${index}`}
          ref={(el) => {
            if (el) {
              rowLabelRefs.current.set(index, el);
            } else {
              rowLabelRefs.current.delete(index);
            }
          }}
          className="segment-grid-label-wrapper segment-grid-label-wrapper--row"
          style={{
            position: "absolute",
            // Initial positioning - will be adjusted by useLayoutEffect
            left: 0,
            top: 0,
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 3,
          }}
        >
          <RowLabel labels={row.responseGroupLabels} />
        </div>
      ))}
    </>
  );
}
