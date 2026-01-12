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
  // Find unique x-coordinates
  const uniqueX = Array.from(
    new Set(segmentDisplay.map((s) => s.segmentGroupBounds.x))
  ).sort((a, b) => a - b);

  return uniqueX.map((x) => {
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
      // Check if this group is the same across all splits in column
      return splitsInColumn.every((split) =>
        split.groups.some(
          (g) =>
            g.question.varName === group.question.varName &&
            g.question.batteryName === group.question.batteryName &&
            g.question.subBattery === group.question.subBattery &&
            ((g.responseGroup === null && group.responseGroup === null) ||
              g.responseGroup?.label === group.responseGroup?.label)
        )
      );
    });

    return { x, width, labelGroups };
  });
}

/**
 * Extract grid rows from segment display by grouping splits with same y-coordinate
 */
function extractGridRows(segmentDisplay: SegmentGroupDisplay[]): GridRow[] {
  // Find unique y-coordinates
  const uniqueY = Array.from(
    new Set(segmentDisplay.map((s) => s.segmentGroupBounds.y))
  ).sort((a, b) => a - b);

  return uniqueY.map((y) => {
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
      // Check if this group is the same across all splits in row
      return splitsInRow.every((split) =>
        split.groups.some(
          (g) =>
            g.question.varName === group.question.varName &&
            g.question.batteryName === group.question.batteryName &&
            g.question.subBattery === group.question.subBattery &&
            ((g.responseGroup === null && group.responseGroup === null) ||
              g.responseGroup?.label === group.responseGroup?.label)
        )
      );
    });

    return { y, height, labelGroups };
  });
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
