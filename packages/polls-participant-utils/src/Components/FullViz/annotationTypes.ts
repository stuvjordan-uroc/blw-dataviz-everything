import { SegmentGroupDisplay } from '../../VizStateManager/types';
import type { ResponseGroupWithStatsAndSegment } from 'shared-types';

/**
 * Response group data with annotation visibility flags
 */
export interface AnnotatedResponseGroup extends Omit<ResponseGroupWithStatsAndSegment, 'pointPositions' | 'pointImage'> {
  showProportionLabel: boolean;
  showSegmentBoundary: boolean;
}

/**
 * Split data with annotation visibility flags
 */
export interface AnnotatedSplit extends Omit<SegmentGroupDisplay, 'responseGroups'> {
  showSplitLabel: boolean;
  showSegmentGroupBoundary: boolean;
  responseGroups: AnnotatedResponseGroup[];
}

/**
 * Annotation configuration - mirrors segmentDisplay structure with visibility flags
 */
export type AnnotationConfig = AnnotatedSplit[];

/**
 * Helper to create default AnnotationConfig from segmentDisplay
 */
export function createDefaultAnnotations(
  segmentDisplay: SegmentGroupDisplay[],
  defaults?: {
    showSplitLabels?: boolean;
    showSegmentGroupBoundaries?: boolean;
    showProportionLabels?: boolean;
    showSegmentBoundaries?: boolean;
  }
): AnnotationConfig {
  const {
    showSplitLabels = true,
    showSegmentGroupBoundaries = false,
    showProportionLabels = false,
    showSegmentBoundaries = true
  } = defaults || {};

  return segmentDisplay.map(split => ({
    ...split,
    showSplitLabel: showSplitLabels,
    showSegmentGroupBoundary: showSegmentGroupBoundaries,
    responseGroups: split.responseGroups.map(rg => ({
      ...rg,
      showProportionLabel: showProportionLabels,
      showSegmentBoundary: showSegmentBoundaries
    }))
  }));
}
