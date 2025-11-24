import type { SessionConfig, Split, ResponseGroup } from 'shared-schemas';
import type { ResponseQuestionVisualization, VizConfigSegments } from './types';
import { layoutSegmentsVertically, layoutSegmentsHorizontally } from './layout/segmentLayout';
import { positionPointsInSegments } from './layout/pointLayout';
import { getQuestionKey } from '../utils';

/**
 * Update all segments in all views with current data.
 * 
 * This function is called when data is available (either initial load or update).
 * It performs two main tasks:
 * 1. Layout individual segments within their groups (set segment bounds)
 * 2. Position points within each segment (set pointPositions)
 * 
 * @param visualizations - All response question visualizations to update
 * @param sessionConfig - Session configuration with question definitions
 * @param splits - Current split statistics from Statistics instance
 * @param vizConfigSegments - Visualization configuration
 */
export function updateAllViewSegments(
  visualizations: ResponseQuestionVisualization[],
  sessionConfig: SessionConfig,
  splits: Split[],
  vizConfigSegments: VizConfigSegments
): void {
  for (const viz of visualizations) {
    for (const view of viz.views) {
      // Get the appropriate response groups for this view (expanded or collapsed)
      const rqFromSession = sessionConfig.responseQuestions.find(
        rq => getQuestionKey(rq) === viz.responseQuestionKey
      );

      if (!rqFromSession) continue;

      const responseGroups: ResponseGroup[] =
        view.responseGroupDisplay === 'expanded'
          ? rqFromSession.responseGroups.expanded
          : rqFromSession.responseGroups.collapsed;

      // Step 1: Layout individual segments within their groups
      layoutSegmentsVertically(view.segments);
      layoutSegmentsHorizontally(
        view.segments,
        responseGroups,
        viz.responseQuestion,
        splits,
        vizConfigSegments
      );

      // Step 2: Position points within each segment
      positionPointsInSegments(
        view.segments,
        viz.points
      );
    }
  }
}
