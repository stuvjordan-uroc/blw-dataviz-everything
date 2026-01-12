import React, { useLayoutEffect, useRef } from "react";
import { SegmentGroupDisplay } from "../../VizStateManager/types";
import type { ResponseGroup, Question } from "shared-types";

/**
 * SegmentGroupGridLabels - Renders row and column labels for the segment group grid
 *
 * Segment groups are arranged in a grid layout where:
 * - Columns are defined by x-axis grouping questions
 * - Rows are defined by y-axis grouping questions
 *
 * This component:
 * - Infers grid structure from segment group bounds geometry
 * - Identifies constant groups that define each column and row
 * - Renders labels in margins with proper positioning
 *
 * CSS Classes (for custom styling):
 * - .segment-grid-label: All labels
 * - .segment-grid-label--column: Column labels (top margin)
 * - .segment-grid-label--row: Row labels (left margin)
 */
export interface SegmentGroupGridLabelsProps {
  /**
   * Segment groups with bounds and group definitions
   */
  segmentDisplay: SegmentGroupDisplay[];

  /**
   * Margin around canvas where labels are rendered
   */
  margin: { x: number; y: number };
}

interface GridColumn {
  x: number;
  width: number;
  labelGroups: Array<{
    question: Question;
    responseGroup: ResponseGroup | null;
  }>;
}

interface GridRow {
  y: number;
  height: number;
  labelGroups: Array<{
    question: Question;
    responseGroup: ResponseGroup | null;
  }>;
}

/**
 * Extract grid columns from segment display by grouping splits with same x-coordinate
 */
function extractGridColumns(
  segmentDisplay: SegmentGroupDisplay[]
): GridColumn[] {
  const columns: GridColumn[] = [];

  for (const segment of segmentDisplay) {
    const x = segment.segmentGroupBounds.x;

    // Check if we already have a column with this x
    if (columns.some((col) => col.x === x)) {
      continue;
    }

    // Get all splits in this column
    const splitsInColumn = segmentDisplay.filter(
      (s) => s.segmentGroupBounds.x === x
    );

    // Width is the same for all splits in column
    const width = splitsInColumn[0].segmentGroupBounds.width;

    // Find groups that are constant across all splits in this column
    // (these define the column)
    const firstSplitGroups = splitsInColumn[0].groups;
    const labelGroups = firstSplitGroups.filter((group) => {
      // Skip groups with null responseGroup - no row/column for that question
      if (group.responseGroup === null) {
        return false;
      }

      // Check if all splits have the same responseGroup label for this question
      return splitsInColumn.every((split) =>
        split.groups.some(
          (g) =>
            g.question.varName === group.question.varName &&
            g.question.batteryName === group.question.batteryName &&
            g.question.subBattery === group.question.subBattery &&
            g.responseGroup?.label === group.responseGroup!.label
        )
      );
    });

    const newColumn: GridColumn = { x, width, labelGroups };

    // Find insertion position to maintain sorted order by x
    const insertIndex = columns.findIndex((col) => col.x > x);
    if (insertIndex === -1) {
      // No column with larger x found, append to end
      columns.push(newColumn);
    } else {
      // Insert before the first column with larger x
      columns.splice(insertIndex, 0, newColumn);
    }
  }

  return columns;
}

/**
 * Extract grid rows from segment display by grouping splits with same y-coordinate
 */
function extractGridRows(segmentDisplay: SegmentGroupDisplay[]): GridRow[] {
  const rows: GridRow[] = [];

  for (const segment of segmentDisplay) {
    const y = segment.segmentGroupBounds.y;

    // Check if we already have a row with this y
    if (rows.some((row) => row.y === y)) {
      continue;
    }

    // Get all splits in this row
    const splitsInRow = segmentDisplay.filter(
      (s) => s.segmentGroupBounds.y === y
    );

    // Height is the same for all splits in row
    const height = splitsInRow[0].segmentGroupBounds.height;

    // Find groups that are constant across all splits in this row
    // (these define the row)
    const firstSplitGroups = splitsInRow[0].groups;
    const labelGroups = firstSplitGroups.filter((group) => {
      // Skip groups with null responseGroup - no row/column for that question
      if (group.responseGroup === null) {
        return false;
      }

      // Check if all splits have the same responseGroup label for this question
      return splitsInRow.every((split) =>
        split.groups.some(
          (g) =>
            g.question.varName === group.question.varName &&
            g.question.batteryName === group.question.batteryName &&
            g.question.subBattery === group.question.subBattery &&
            g.responseGroup?.label === group.responseGroup!.label
        )
      );
    });

    const newRow: GridRow = { y, height, labelGroups };

    // Find insertion position to maintain sorted order by y
    const insertIndex = rows.findIndex((row) => row.y > y);
    if (insertIndex === -1) {
      // No row with larger y found, append to end
      rows.push(newRow);
    } else {
      // Insert before the first row with larger y
      rows.splice(insertIndex, 0, newRow);
    }
  }

  return rows;
}

export function SegmentGroupGridLabels({
  segmentDisplay,
  margin,
}: SegmentGroupGridLabelsProps) {
  const columnLabelRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const rowLabelRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Extract grid structure from geometry
  const gridColumns = extractGridColumns(segmentDisplay);
  const gridRows = extractGridRows(segmentDisplay);

  // Center labels based on measured dimensions
  useLayoutEffect(() => {
    // Center column labels horizontally within their column
    columnLabelRefs.current.forEach((labelDiv, columnIndex) => {
      const column = gridColumns[columnIndex];
      const labelWidth = labelDiv.offsetWidth;
      const labelHeight = labelDiv.offsetHeight;

      // Center horizontally on column, center vertically in top margin
      const left = column.x + (column.width - labelWidth) / 2;
      const top = (margin.y - labelHeight) / 2;

      labelDiv.style.left = `${margin.x + left}px`;
      labelDiv.style.top = `${top}px`;
    });

    // Center row labels vertically within their row
    rowLabelRefs.current.forEach((labelDiv, rowIndex) => {
      const row = gridRows[rowIndex];
      const labelWidth = labelDiv.offsetWidth;
      const labelHeight = labelDiv.offsetHeight;

      // Center vertically on row, center horizontally in left margin
      const left = (margin.x - labelWidth) / 2;
      const top = row.y + (row.height - labelHeight) / 2;

      labelDiv.style.left = `${left}px`;
      labelDiv.style.top = `${margin.y + top}px`;
    });
  });

  return (
    <>
      {/* Column labels (top margin) */}
      {gridColumns.map((column, index) => {
        const labelText = column.labelGroups
          .filter((g) => g.responseGroup !== null)
          .map((g) => g.responseGroup!.label)
          .join(", ");

        if (!labelText) return null;

        return (
          <div
            key={`col-${index}`}
            ref={(el) => {
              if (el) columnLabelRefs.current.set(index, el);
            }}
            className="segment-grid-label segment-grid-label--column"
            style={{
              position: "absolute",
              // Initial positioning - will be adjusted by useLayoutEffect
              left: 0,
              top: 0,
              // Default size - overridable by caller's CSS
              maxWidth: column.width,
              maxHeight: margin.y,
              userSelect: "none",
            }}
          >
            {labelText}
          </div>
        );
      })}

      {/* Row labels (left margin) */}
      {gridRows.map((row, index) => {
        const labelText = row.labelGroups
          .filter((g) => g.responseGroup !== null)
          .map((g) => g.responseGroup!.label)
          .join(", ");

        if (!labelText) return null;

        return (
          <div
            key={`row-${index}`}
            ref={(el) => {
              if (el) rowLabelRefs.current.set(index, el);
            }}
            className="segment-grid-label segment-grid-label--row"
            style={{
              position: "absolute",
              // Initial positioning - will be adjusted by useLayoutEffect
              left: 0,
              top: 0,
              // Default size - overridable by caller's CSS
              maxWidth: margin.x,
              maxHeight: row.height,
              userSelect: "none",
            }}
          >
            {labelText}
          </div>
        );
      })}
    </>
  );
}
