import type { SessionConfig, Question, ResponseGroup } from "shared-schemas";
import { getQuestionKey } from '../utils';
import type { VizConfigSegments, SegmentGroupGrid, SegmentGroupRow, SegmentGroupColumn, SegmentGroup, SegmentVizView, ResponseGroupDisplay } from './types';

/**
 * Generate all possible combinations of active grouping questions.
 * Returns 2^n configurations where n = total grouping questions in horizontal ∪ vertical.
 */
export function generateViewConfigurations(
  vizConfigSegments: VizConfigSegments
): Array<{
  activeHorizontal: Question[];
  activeVertical: Question[];
  activeAll: Question[];
}> {
  const allHorizontal = vizConfigSegments.groupingQuestionsHorizontal;
  const allVertical = vizConfigSegments.groupingQuestionsVertical;

  // Generate all subsets (power set)
  const horizontalSubsets = powerSet(allHorizontal);
  const verticalSubsets = powerSet(allVertical);

  const configs: Array<{
    activeHorizontal: Question[];
    activeVertical: Question[];
    activeAll: Question[];
  }> = [];

  for (const hSubset of horizontalSubsets) {
    for (const vSubset of verticalSubsets) {
      configs.push({
        activeHorizontal: hSubset,
        activeVertical: vSubset,
        activeAll: [...hSubset, ...vSubset]
      });
    }
  }

  return configs;
}

/**
 * Generate a 2D grid of segment groups.
 * Grid structure:
 * - Rows = unique vertical grouping combinations (top to bottom in Cartesian order)
 * - Columns = unique horizontal grouping combinations (left to right in Cartesian order)
 * - Each cell contains segments for one response group combination
 */
export function generateSegmentGroups(
  responseQuestion: Question,
  sessionConfig: SessionConfig,
  activeHorizontal: Question[],
  activeVertical: Question[],
  display: ResponseGroupDisplay
): SegmentGroupGrid {
  // Get response groups for the response question
  const rqFromSession = sessionConfig.responseQuestions.find(
    rq => getQuestionKey(rq) === getQuestionKey(responseQuestion)
  );

  if (!rqFromSession) {
    throw new Error(`Response question not found in sessionConfig: ${getQuestionKey(responseQuestion)}`);
  }

  const responseGroups = display === 'expanded'
    ? rqFromSession.responseGroups.expanded
    : rqFromSession.responseGroups.collapsed;

  // Build Cartesian products for vertical and horizontal dimensions
  const verticalCombinations = activeVertical.length > 0
    ? cartesianProduct(
      activeVertical.map(q => getResponseGroupsForQuestion(q, sessionConfig))
    )
    : [[]]; // Empty array for no vertical grouping

  const horizontalCombinations = activeHorizontal.length > 0
    ? cartesianProduct(
      activeHorizontal.map(q => getResponseGroupsForQuestion(q, sessionConfig))
    )
    : [[]]; // Empty array for no horizontal grouping

  // Create columns first (one per horizontal combination)
  const columns: SegmentGroupColumn[] = horizontalCombinations.map(hCombo => ({
    horizontalGroupings: hCombo,
    x: 0,     // Will be set by horizontal layout
    width: 0  // Will be set by horizontal layout
  }));

  // Create grid structure: rows (vertical) × columns (horizontal)
  const rows: SegmentGroupRow[] = [];

  for (const vCombo of verticalCombinations) {
    const cells: SegmentGroup[] = [];

    for (const hCombo of horizontalCombinations) {
      // Create segment group (cell) for this vertical × horizontal combination
      const segmentGroup: SegmentGroup = {
        segments: responseGroups.map(rg => ({
          responseGroup: rg,
          activeGroupings: [...vCombo, ...hCombo],
          bounds: { x: 0, y: 0, width: 0, height: 0 }, // Will be set later
          pointPositions: []
        }))
      };

      cells.push(segmentGroup);
    }

    // Create row with this vertical combination
    const row: SegmentGroupRow = {
      verticalGroupings: vCombo,
      y: 0,      // Will be set by vertical layout
      height: 0, // Will be set by vertical layout
      cells
    };

    rows.push(row);
  }

  return { rows, columns };
}

/**
 * Get response groups for a specific grouping question from session config.
 */
function getResponseGroupsForQuestion(
  question: Question,
  sessionConfig: SessionConfig
): ResponseGroup[] {
  const gq = sessionConfig.groupingQuestions.find(
    q => getQuestionKey(q) === getQuestionKey(question)
  );

  if (!gq) {
    throw new Error(`Grouping question not found in sessionConfig: ${getQuestionKey(question)}`);
  }

  return gq.responseGroups;
}

/**
 * Generate power set (all subsets) of an array.
 * For [a, b], returns [[], [a], [b], [a, b]].
 */
function powerSet<T>(arr: T[]): T[][] {
  const result: T[][] = [[]];
  for (const item of arr) {
    const len = result.length;
    for (let i = 0; i < len; i++) {
      result.push([...result[i], item]);
    }
  }
  return result;
}

/**
 * Generate Cartesian product of arrays.
 * For [[a, b], [1, 2]], returns [[a, 1], [a, 2], [b, 1], [b, 2]].
 * For empty input, returns [[]].
 */
function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const restProduct = cartesianProduct(rest);
  return first.flatMap(item =>
    restProduct.map(combo => [item, ...combo])
  );
}

/**
 * Generate all views for a response question (all active question combinations × expanded/collapsed).
 * Note: This only sets up segment group bounds (vertical/horizontal layout).
 * Individual segment bounds within groups are set later when data is available.
 */
export function generateAllViews(
  responseQuestion: Question,
  sessionConfig: SessionConfig,
  vizConfigSegments: VizConfigSegments,
  vizWidth: number,
  vizHeight: number,
  layoutVertically: (grid: SegmentGroupGrid, activeVertical: Question[], vizHeight: number, config: VizConfigSegments) => void,
  layoutHorizontally: (grid: SegmentGroupGrid, activeHorizontal: Question[], vizWidth: number, config: VizConfigSegments) => void
): SegmentVizView[] {
  const views: SegmentVizView[] = [];

  // Generate all possible combinations of active questions
  const viewConfigs = generateViewConfigurations(vizConfigSegments);

  // For each configuration, create both expanded and collapsed views
  for (const config of viewConfigs) {
    for (const display of ['expanded', 'collapsed'] as ResponseGroupDisplay[]) {
      const view = createView(
        responseQuestion,
        sessionConfig,
        vizConfigSegments,
        config.activeHorizontal,
        config.activeVertical,
        config.activeAll,
        display,
        vizWidth,
        vizHeight,
        layoutVertically,
        layoutHorizontally
      );
      views.push(view);
    }
  }

  return views;
}

/**
 * Create a single view for a specific combination of active questions and display mode.
 * Sets up segment group bounds (vertical/horizontal) but not individual segment bounds.
 */
function createView(
  responseQuestion: Question,
  sessionConfig: SessionConfig,
  vizConfigSegments: VizConfigSegments,
  activeHorizontal: Question[],
  activeVertical: Question[],
  activeAll: Question[],
  display: ResponseGroupDisplay,
  vizWidth: number,
  vizHeight: number,
  layoutVertically: (grid: SegmentGroupGrid, activeVertical: Question[], vizHeight: number, config: VizConfigSegments) => void,
  layoutHorizontally: (grid: SegmentGroupGrid, activeHorizontal: Question[], vizWidth: number, config: VizConfigSegments) => void
): SegmentVizView {
  // Step 1: Generate segment group grid (2D structure)
  // sets all layout parameters on each segment group (x,y,width,height) to 0
  const grid = generateSegmentGroups(
    responseQuestion,
    sessionConfig,
    activeHorizontal,
    activeVertical,
    display //"expanded" | "collapsed"
  );

  // Step 2: Layout grid vertically (assign y, height to each row)
  layoutVertically(grid, activeVertical, vizHeight, vizConfigSegments);

  // Step 3: Layout grid horizontally (assign x, width to each column)
  layoutHorizontally(grid, activeHorizontal, vizWidth, vizConfigSegments);

  // Step 4: Copy row/column positions to segments within each cell
  // This sets the initial bounds for each segment based on its cell position
  for (const row of grid.rows) {
    for (let colIndex = 0; colIndex < row.cells.length; colIndex++) {
      const cell = row.cells[colIndex];
      const column = grid.columns[colIndex];

      for (const segment of cell.segments) {
        segment.bounds.y = row.y;
        segment.bounds.height = row.height;
        segment.bounds.x = column.x;
        segment.bounds.width = column.width;
      }
    }
  }

  return {
    activeGroupingQuestions: activeAll,
    responseGroupDisplay: display,
    grid
  };
}
