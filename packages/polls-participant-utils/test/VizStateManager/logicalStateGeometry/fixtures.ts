/**
 * Test fixtures for geometric validation tests
 * 
 * ARCHITECTURE:
 * These fixtures are organized around an explicit grid structure (GridStructure) that serves
 * as the single source of truth for test geometry. This ensures that gridLabels and splits
 * are always consistent by construction.
 * 
 * FLOW:
 * 1. Define a GridStructure with columns, rows, and cells containing segment data
 * 2. Use buildGridLabelsFromStructure() to create GridLabelsDisplay for each view
 * 3. Use buildSplitsFromStructure() to create SplitWithSegmentGroup[] matching the grid
 * 4. Both functions reference the same column/row geometry, guaranteeing alignment
 * 
 * This approach eliminates the possibility of misaligned grid labels and segment groups
 * in test fixtures, allowing validation tests to focus on the actual computation logic.
 */

import { createMockVisualizationData } from '../fixtures';
import { MockImage } from '../mocks';
import type {
  SplitWithSegmentGroup,
  VisualizationData,
  GridLabelsDisplay,
  ResponseGroupWithStatsAndSegment,
  Point
} from 'shared-types';
import type { PointLoadedImage } from '../../../src/types';
import type { VizData, CanvasData } from '../../../src/VizStateManager/types';

/**
 * Grid column definition - exactly as defined in GridLabelsDisplay
 */
type GridColumn = GridLabelsDisplay['columns'][number];

/**
 * Grid row definition - exactly as defined in GridLabelsDisplay
 */
type GridRow = GridLabelsDisplay['rows'][number];

/**
 * Simplified point definition for fixture input.
 * Derived from Point but with simplified position data (x, y as direct properties).
 * The buildSplitsFromStructure function converts this to full Point + PointPosition structures.
 */
interface FixturePoint {
  id: number;                          // Corresponds to Point.id
  x: number;                           // Will become PointPosition.x
  y: number;                           // Will become PointPosition.y
  expandedResponseGroupIdx?: number;   // Corresponds to Point.expandedResponseGroupIdx (only needed for collapsed segments)
}

/**
 * Defines a segment within a cell for fixture input.
 * Derived from ResponseGroupWithStatsAndSegment but with:
 * - Only the input fields (label, proportion)
 * - Simplified points structure (FixturePoint[] instead of PointPosition[])
 * - Computed fields (values, totalCount, totalWeight, bounds, pointImage) are derived by buildSplitsFromStructure
 */
interface CellSegment extends Pick<ResponseGroupWithStatsAndSegment, 'label' | 'proportion'> {
  points: FixturePoint[];  // Will be converted to pointPositions in ResponseGroupWithStatsAndSegment
}

/**
 * Defines a cell at a specific grid position with its segment data.
 * 
 * Derived from SplitWithSegmentGroup by:
 * - Omitting computed fields: basisSplitIndices, groups, totalWeight, totalCount, points, segmentGroupBounds
 * - Replacing responseGroups (with full ResponseGroupWithStatsAndSegment) with segments (simplified CellSegment)
 * - Adding columnIdx/rowIdx to specify grid position (used to compute segmentGroupBounds)
 */
type GridCell = Omit<SplitWithSegmentGroup, 'basisSplitIndices' | 'groups' | 'totalWeight' | 'totalCount' | 'points' | 'segmentGroupBounds' | 'responseGroups'> & {
  columnIdx: number;   // Index into GridStructure.columns (used to compute segmentGroupBounds.x/width)
  rowIdx: number;      // Index into GridStructure.rows (used to compute segmentGroupBounds.y/height)
  segments: {
    expanded: CellSegment[];   // Will be converted to responseGroups.expanded
    collapsed: CellSegment[];  // Will be converted to responseGroups.collapsed
  };
};

/**
 * The complete grid structure that serves as the source of truth for test geometry.
 * 
 * All grid labels and splits are derived from this structure to ensure consistency.
 */
interface GridStructure {
  columns: GridColumn[];  // Column definitions (x, width, labels)
  rows: GridRow[];        // Row definitions (y, height, labels)
  cells: GridCell[];      // Cell data (which column/row, what segments/points)
}

/**
 * Configuration for deriving grid labels from a grid structure
 */
interface GridLabelsConfig {
  viewId: string;        // The view identifier
  columnIndices?: number[];  // Which columns to include (defaults to all)
  rowIndices?: number[];     // Which rows to include (defaults to all)
}

export interface GeometryTestFixture {
  vizData: VisualizationData;
  canvasData: CanvasData;
  loadedImages: Map<string, PointLoadedImage>;
}

/**
 * Build GridLabelsDisplay from a grid structure for a specific view.
 * 
 * PURPOSE:
 * Creates the grid label geometry that the client will use to render column/row labels.
 * Each column/row in the output contains its position, size, and associated labels.
 * 
 * HOW IT WORKS:
 * 1. Takes column/row indices to determine which columns/rows are visible in this view
 * 2. For each visible column, copies its x, width, and labels into the output
 * 3. For each visible row, copies its y, height, and labels into the output
 * 4. The resulting GridLabelsDisplay has geometry that exactly matches the segment groups
 *    built by buildSplitsFromStructure() for the same grid structure
 * 
 * CONSISTENCY GUARANTEE:
 * Since both grid labels and splits reference the same column/row objects from gridStructure,
 * they will always have matching x/width (columns) and y/height (rows) values.
 * 
 * @param gridStructure - The complete grid definition
 * @param config - View configuration (which columns/rows to include)
 * @returns GridLabelsDisplay for the specified view
 */
function buildGridLabelsFromStructure(
  gridStructure: GridStructure,
  config: GridLabelsConfig
): GridLabelsDisplay {
  // Default to all columns/rows if not specified
  const columnIndices = config.columnIndices ?? gridStructure.columns.map((_, i) => i);
  const rowIndices = config.rowIndices ?? gridStructure.rows.map((_, i) => i);

  return {
    columns: columnIndices.map(idx => gridStructure.columns[idx]),
    rows: rowIndices.map(idx => gridStructure.rows[idx])
  };
}

/**
 * Build SplitWithSegmentGroup[] from a grid structure.
 * 
 * PURPOSE:
 * Creates the visualization splits that represent segment groups and their segments.
 * Each split corresponds to one cell in the grid, positioned at the intersection of
 * a column and row.
 * 
 * HOW IT WORKS:
 * 1. Iterates through each cell in the grid structure
 * 2. For each cell, determines its position using the column and row it references:
 *    - segmentGroupBounds.x = column.x
 *    - segmentGroupBounds.width = column.width
 *    - segmentGroupBounds.y = row.y
 *    - segmentGroupBounds.height = row.height
 * 3. Builds expanded segments within the cell:
 *    - Calculates segment widths based on each segment's proportion
 *    - Positions segments left-to-right with gaps between them
 *    - Segment bounds are relative to segment group (x/y start at 0)
 * 4. Builds collapsed segments (all response groups combined into one segment)
 * 5. Creates point data for each segment using the cell's point definitions
 * 
 * SEGMENT POSITIONING:
 * - Segment x positions are relative to the segment group (not absolute canvas coords)
 * - The first segment starts at x=0, subsequent segments are offset by previous widths + gaps
 * - Segment y is always 0 (segments span full height of their group)
 * - Segment height always matches segment group height
 * 
 * CONSISTENCY GUARANTEE:
 * Since segment group bounds come from the same column/row objects that buildGridLabelsFromStructure()
 * uses, the segment groups will perfectly align with their corresponding grid labels.
 * 
 * @param gridStructure - The complete grid definition
 * @param responseGap - Gap in abstract units between adjacent segments
 * @returns Array of splits, one per grid cell
 */
function buildSplitsFromStructure(
  gridStructure: GridStructure,
  responseGap: number
): SplitWithSegmentGroup[] {
  return gridStructure.cells.map((cell, cellIdx) => {
    // Get the column and row for this cell's position
    const column = gridStructure.columns[cell.columnIdx];
    const row = gridStructure.rows[cell.rowIdx];

    // Segment group bounds match the grid cell position exactly
    const segmentGroupBounds = {
      x: column.x,
      y: row.y,
      width: column.width,
      height: row.height
    };

    // Build expanded segments with proportional widths
    let xOffset = 0;
    const expandedResponseGroups = cell.segments.expanded.map((seg, segIdx) => {
      // Calculate segment width based on its proportion of the available width
      // Available width = column width minus gaps between segments
      const availableWidth = column.width - (responseGap * (cell.segments.expanded.length - 1));
      const segmentWidth = Math.round(seg.proportion * availableWidth);

      const bounds = {
        x: xOffset,  // Relative to segment group
        y: 0,        // Relative to segment group
        width: segmentWidth,
        height: segmentGroupBounds.height
      };

      // Move offset for next segment
      xOffset += segmentWidth + responseGap;

      return {
        label: seg.label,
        values: [segIdx],
        totalCount: seg.points.length,
        totalWeight: seg.points.length,
        proportion: seg.proportion,
        bounds,
        pointPositions: seg.points.map(pt => ({
          point: {
            splitIdx: cellIdx,
            expandedResponseGroupIdx: segIdx,
            id: pt.id
          },
          // Point positions are defined in absolute coordinates within the segment group
          // but need to be relative to the segment bounds
          x: pt.x - bounds.x,
          y: pt.y - bounds.y
        })),
        pointImage: {
          svgDataURL: `cell${cellIdx}-exp${segIdx}`,
          offsetToCenter: { x: 5, y: 5 }
        }
      };
    });

    // Build collapsed segments (all expanded groups combined)
    const collapsedResponseGroups = cell.segments.collapsed.map((seg, segIdx) => {
      const availableWidth = column.width - responseGap;

      const bounds = {
        x: 0,
        y: 0,
        width: availableWidth,
        height: segmentGroupBounds.height
      };

      return {
        label: seg.label,
        values: cell.segments.expanded.map((_, i) => i),  // All expanded indices
        totalCount: seg.points.length,
        totalWeight: seg.points.length,
        proportion: seg.proportion,
        bounds,
        pointPositions: seg.points.map(pt => ({
          point: {
            splitIdx: cellIdx,
            expandedResponseGroupIdx: pt.expandedResponseGroupIdx ?? 0,
            id: pt.id
          },
          // Point positions are defined in absolute coordinates within the segment group
          // but need to be relative to the segment bounds
          x: pt.x - bounds.x,
          y: pt.y - bounds.y
        })),
        pointImage: {
          svgDataURL: `cell${cellIdx}-col${segIdx}`,
          offsetToCenter: { x: 7, y: 7 }
        }
      };
    });

    return {
      basisSplitIndices: [cellIdx],
      groups: [],
      totalWeight: expandedResponseGroups.reduce((sum, rg) => sum + rg.totalWeight, 0),
      totalCount: expandedResponseGroups.reduce((sum, rg) => sum + rg.totalCount, 0),
      segmentGroupBounds,
      points: expandedResponseGroups.map(rg => rg.pointPositions.map(pp => pp.point)),
      responseGroups: {
        expanded: expandedResponseGroups,
        collapsed: collapsedResponseGroups
      }
    };
  });
}

/**
 * Create a simple fixture with 1x1 grid (single segment group)
 * 
 * STRUCTURE:
 * - 1 column: full width (800 units), no grouping labels
 * - 1 row: full height (600 units), no grouping labels
 * - 1 cell: 2 expanded segments (Option A, Option B) at 50/50 proportion
 * 
 * USE CASE:
 * Tests basic geometric validation without the complexity of multiple segment groups.
 */
export function createSimpleFixture(): GeometryTestFixture {
  const vizWidth = 800;
  const vizHeight = 600;
  const responseGap = 10;

  // Define the grid structure (source of truth) - all geometry derived from vizWidth/vizHeight
  const gridStructure: GridStructure = {
    columns: [
      { x: 0, width: vizWidth, responseGroupLabels: [] }  // Single column spans full width
    ],
    rows: [
      { y: 0, height: vizHeight, responseGroupLabels: [] }  // Single row spans full height
    ],
    cells: [
      {
        columnIdx: 0,
        rowIdx: 0,
        segments: {
          expanded: [
            {
              label: 'Option A',
              proportion: 0.5,
              points: [
                { id: 1, x: vizWidth * 0.15, y: vizHeight * 0.2 },
                { id: 2, x: vizWidth * 0.25, y: vizHeight * 0.35 }
              ]
            },
            {
              label: 'Option B',
              proportion: 0.5,
              points: [
                { id: 3, x: vizWidth * 0.65, y: vizHeight * 0.25 }
              ]
            }
          ],
          collapsed: [
            {
              label: 'All',
              proportion: 1.0,
              points: [
                { id: 1, x: vizWidth * 0.15, y: vizHeight * 0.2, expandedResponseGroupIdx: 0 },
                { id: 2, x: vizWidth * 0.25, y: vizHeight * 0.35, expandedResponseGroupIdx: 0 },
                { id: 3, x: vizWidth * 0.65, y: vizHeight * 0.5, expandedResponseGroupIdx: 1 }
              ]
            }
          ]
        }
      }
    ]
  };

  // Build grid labels from structure
  const gridLabels: Record<string, GridLabelsDisplay> = {
    '': buildGridLabelsFromStructure(gridStructure, { viewId: '' })
  };

  // Build splits from structure
  const splits = buildSplitsFromStructure(gridStructure, responseGap);

  // Create visualization data
  const vizData = createMockVisualizationData({
    splits,
    basisSplitIndices: [0],
    viewMaps: { '': [0] },
    gridLabels,
    vizWidth,
    vizHeight
  });

  // Create mock images for all segments
  const loadedImages = new Map<string, PointLoadedImage>();
  ['cell0-exp0', 'cell0-exp1', 'cell0-col0'].forEach(key => {
    loadedImages.set(key, {
      image: new MockImage() as any,
      offsetToCenter: key.includes('exp') ? { x: 5, y: 5 } : { x: 7, y: 7 }
    });
  });

  const canvasData = {
    element: {} as any,
    context: {} as any,
    pixelWidth: vizWidth,
    pixelHeight: vizHeight,
    margin: { x: 0, y: 0 }
  };

  return { vizData, canvasData, loadedImages };
}


/**
 * Create a complex fixture with 2x2 grid (4 segment groups)
 * 
 * STRUCTURE:
 * - 2 columns: Male (x=0, width=490), Female (x=510, width=490)
 * - 2 rows: 18-34 (y=0, height=390), 35+ (y=410, height=390)
 * - 4 cells: each with 2 expanded segments at varying proportions
 * - 3 views: base (full 2x2 grid), view1 (top row only), view2 (bottom row only)
 * 
 * USE CASE:
 * Tests geometric validation with multiple segment groups, view changes, and
 * different segment proportions across cells.
 */
export function createComplexFixture(): GeometryTestFixture {
  const vizWidth = 1000;
  const vizHeight = 800;
  const responseGap = 10;
  const groupGap = 20;  // Gap between columns and between rows

  // Calculate column and row dimensions from viz dimensions
  const columnWidth = (vizWidth - groupGap) / 2;  // Two columns with one gap between
  const rowHeight = (vizHeight - groupGap) / 2;   // Two rows with one gap between

  // Define the grid structure (source of truth) - all geometry derived from vizWidth/vizHeight
  const gridStructure: GridStructure = {
    columns: [
      { x: 0, width: columnWidth, responseGroupLabels: ['Male'] },
      { x: columnWidth + groupGap, width: columnWidth, responseGroupLabels: ['Female'] }
    ],
    rows: [
      { y: 0, height: rowHeight, responseGroupLabels: ['18-34'] },
      { y: rowHeight + groupGap, height: rowHeight, responseGroupLabels: ['35+'] }
    ],
    cells: [
      // Cell 0: Male, 18-34 (60% Yes, 40% No)
      {
        columnIdx: 0,
        rowIdx: 0,
        segments: {
          expanded: [
            {
              label: 'Yes',
              proportion: 0.6,
              points: [{ id: 1, x: columnWidth * 0.2, y: rowHeight * 0.3 }]
            },
            {
              label: 'No',
              proportion: 0.4,
              points: [{ id: 2, x: columnWidth * 0.7, y: rowHeight * 0.4 }]
            }
          ],
          collapsed: [
            {
              label: 'All',
              proportion: 1.0,
              points: [
                { id: 1, x: columnWidth * 0.2, y: rowHeight * 0.3, expandedResponseGroupIdx: 0 },
                { id: 2, x: columnWidth * 0.7, y: rowHeight * 0.4, expandedResponseGroupIdx: 1 }
              ]
            }
          ]
        }
      },
      // Cell 1: Female, 18-34 (70% Yes, 30% No)
      {
        columnIdx: 1,
        rowIdx: 0,
        segments: {
          expanded: [
            {
              label: 'Yes',
              proportion: 0.7,
              points: [{ id: 3, x: columnWidth * 0.3, y: rowHeight * 0.25 }]
            },
            {
              label: 'No',
              proportion: 0.3,
              points: [{ id: 4, x: columnWidth * 0.75, y: rowHeight * 0.35 }]
            }
          ],
          collapsed: [
            {
              label: 'All',
              proportion: 1.0,
              points: [
                { id: 3, x: columnWidth * 0.3, y: rowHeight * 0.25, expandedResponseGroupIdx: 0 },
                { id: 4, x: columnWidth * 0.75, y: rowHeight * 0.35, expandedResponseGroupIdx: 1 }
              ]
            }
          ]
        }
      },
      // Cell 2: Male, 35+ (50% Yes, 50% No)
      {
        columnIdx: 0,
        rowIdx: 1,
        segments: {
          expanded: [
            {
              label: 'Yes',
              proportion: 0.5,
              points: [{ id: 5, x: columnWidth * 0.25, y: rowHeight * 0.5 }]
            },
            {
              label: 'No',
              proportion: 0.5,
              points: [{ id: 6, x: columnWidth * 0.65, y: rowHeight * 0.6 }]
            }
          ],
          collapsed: [
            {
              label: 'All',
              proportion: 1.0,
              points: [
                { id: 5, x: columnWidth * 0.25, y: rowHeight * 0.5, expandedResponseGroupIdx: 0 },
                { id: 6, x: columnWidth * 0.65, y: rowHeight * 0.6, expandedResponseGroupIdx: 1 }
              ]
            }
          ]
        }
      },
      // Cell 3: Female, 35+ (80% Yes, 20% No)
      {
        columnIdx: 1,
        rowIdx: 1,
        segments: {
          expanded: [
            {
              label: 'Yes',
              proportion: 0.8,
              points: [{ id: 7, x: columnWidth * 0.4, y: rowHeight * 0.45 }]
            },
            {
              label: 'No',
              proportion: 0.2,
              points: [{ id: 8, x: columnWidth * 0.85, y: rowHeight * 0.55 }]
            }
          ],
          collapsed: [
            {
              label: 'All',
              proportion: 1.0,
              points: [
                { id: 7, x: columnWidth * 0.4, y: rowHeight * 0.45, expandedResponseGroupIdx: 0 },
                { id: 8, x: columnWidth * 0.85, y: rowHeight * 0.55, expandedResponseGroupIdx: 1 }
              ]
            }
          ]
        }
      }
    ]
  };

  // Build grid labels for all views
  const gridLabels: Record<string, GridLabelsDisplay> = {
    '': buildGridLabelsFromStructure(gridStructure, { viewId: '' }),
    'view1': buildGridLabelsFromStructure(gridStructure, {
      viewId: 'view1',
      rowIndices: [0]  // Top row only
    }),
    'view2': buildGridLabelsFromStructure(gridStructure, {
      viewId: 'view2',
      rowIndices: [1]  // Bottom row only
    })
  };

  // Build splits from structure
  const splits = buildSplitsFromStructure(gridStructure, responseGap);

  // Create visualization data
  const vizData = createMockVisualizationData({
    splits,
    basisSplitIndices: [0, 1, 2, 3],
    viewMaps: {
      '': [0, 1, 2, 3],    // All cells
      'view1': [0, 1],     // Top row cells
      'view2': [2, 3]      // Bottom row cells
    },
    gridLabels,
    vizWidth,
    vizHeight
  });

  // Create mock images for all segments
  const loadedImages = new Map<string, PointLoadedImage>();
  for (let cellIdx = 0; cellIdx < 4; cellIdx++) {
    for (let segIdx = 0; segIdx < 2; segIdx++) {
      loadedImages.set(`cell${cellIdx}-exp${segIdx}`, {
        image: new MockImage() as any,
        offsetToCenter: { x: 5, y: 5 }
      });
    }
    loadedImages.set(`cell${cellIdx}-col0`, {
      image: new MockImage() as any,
      offsetToCenter: { x: 7, y: 7 }
    });
  }

  const canvasData = {
    element: {} as any,
    context: {} as any,
    pixelWidth: vizWidth,
    pixelHeight: vizHeight,
    margin: { x: 0, y: 0 }
  };

  return { vizData, canvasData, loadedImages };
}
