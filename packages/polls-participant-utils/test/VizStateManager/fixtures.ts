/**
 * Test fixtures for VizStateManager tests
 * 
 * Provides realistic test data for VisualizationData, VizRenderConfig,
 * and related structures.
 */

import type { VisualizationData, SplitWithSegmentGroup, VisualizationUpdateEvent } from 'shared-types';
import type { PointLoadedImage, VizRenderConfig } from '../../src/types';
import { MockImage } from './mocks';

/**
 * Create a minimal but valid SplitWithSegmentGroup for testing
 * 
 * @param index - Split index, used to vary SVG URLs and basis indices
 * @param overrides - Optional property overrides
 */
export function createMockSplit(index: number = 0, overrides?: Partial<SplitWithSegmentGroup>): SplitWithSegmentGroup {
  // Generate unique SVG URLs for each split index
  const svgUrlExpanded = `data:image/svg+xml;base64,SPLIT${index}EXPANDED`;
  const svgUrlCollapsed = `data:image/svg+xml;base64,SPLIT${index}COLLAPSED`;

  return {
    basisSplitIndices: [index],
    groups: [],
    totalWeight: 100,
    totalCount: 100,
    segmentGroupBounds: { x: 10, y: 10, width: 800, height: 600 }, //x and y set to 10 to test correct point translation
    points: [[]],
    responseGroups: {
      expanded: [
        {
          label: 'Option A',
          values: [0],
          totalCount: 50,
          totalWeight: 50,
          proportion: 0.5,
          bounds: { x: 50, y: 50, width: 100, height: 100 }, //x and y set to 50 to test correct point translation
          pointPositions: [],
          pointImage: {
            svgDataURL: svgUrlExpanded,
            offsetToCenter: { x: 5, y: 5 }
          }
        }
      ],
      collapsed: [
        {
          label: 'All Options',
          values: [0],
          totalCount: 100,
          totalWeight: 100,
          proportion: 1.0,
          bounds: { x: 100, y: 100, width: 200, height: 100 }, //x and y set to 100 to test correct point translation
          pointPositions: [],
          pointImage: {
            svgDataURL: svgUrlCollapsed,
            offsetToCenter: { x: 7, y: 7 }
          }
        }
      ]
    },
    ...overrides
  };
}

/**
 * Create a minimal but valid VisualizationData for testing
 * 
 * By default, creates 3 splits with disjoint viewMaps for testing setClientViewId:
 * - Base view '' maps to [0]
 * - View 'view1' maps to [1]  
 * - View 'view2' maps to [2]
 */
export function createMockVisualizationData(overrides?: Partial<VisualizationData>): VisualizationData {
  return {
    visualizationId: 'test-viz-1',
    config: {
      responseQuestion: {
        question: { varName: 'testQ', batteryName: 'testBattery', subBattery: '' },
        responseGroups: {
          expanded: [{ label: 'Option A', values: [0] }],
          collapsed: [{ label: 'All', values: [0] }]
        }
      },
      groupingQuestions: { x: [], y: [] },
      minGroupAvailableWidth: 100,
      minGroupHeight: 100,
      groupGapX: 10,
      groupGapY: 10,
      responseGap: 5,
      baseSegmentWidth: 50,
      images: {
        circleRadius: 10,
        baseColorRange: ['#ff0000', '#0000ff'],
        groupColorOverrides: []
      }
    },
    sequenceNumber: 1,
    // Create 3 distinct splits for testing view switching
    splits: [
      createMockSplit(0),
      createMockSplit(1),
      createMockSplit(2)
    ],
    basisSplitIndices: [0, 1, 2],
    lastUpdated: '2026-01-07T00:00:00Z',
    // ViewMaps with disjoint split indices for testing setClientViewId
    viewMaps: {
      '': [0],        // Base view - split 0 only
      'view1': [1],   // View 1 - split 1 only
      'view2': [2]    // View 2 - split 2 only
    },
    vizWidth: 800,
    vizHeight: 600,
    ...overrides
  };
}

/**
 * Create a mock VizRenderConfig for testing
 */
export function createMockVizRenderConfig(overrides?: Partial<VizRenderConfig>): VizRenderConfig {
  return {
    initialCanvasWidth: 800,
    initialDisplayMode: 'expanded',
    initialViewId: '',
    animation: {
      appearDuration: 200,
      disappearDuration: 150,
      moveDuration: 400,
      imageChangeDuration: 400
    },
    margin: { x: 0, y: 0 },
    ...overrides
  };
}

/**
 * Create a mock Map of loaded images
 * 
 * Includes images for all splits (0, 1, 2) in both expanded and collapsed modes,
 * plus common point keys used in tests
 */
export function createMockLoadedImages(): Map<string, PointLoadedImage> {
  const map = new Map<string, PointLoadedImage>();

  // Add images for each split (0, 1, 2) in expanded and collapsed modes
  for (let i = 0; i < 3; i++) {
    map.set(`data:image/svg+xml;base64,SPLIT${i}EXPANDED`, {
      image: new MockImage() as any as HTMLImageElement,
      offsetToCenter: { x: 5, y: 5 }
    });

    map.set(`data:image/svg+xml;base64,SPLIT${i}COLLAPSED`, {
      image: new MockImage() as any as HTMLImageElement,
      offsetToCenter: { x: 7, y: 7 }
    });
  }

  // Add images for common point keys used in mocked tests
  // These match the point keys returned by mocked computeTargetVisibleState in setMethods tests
  const commonPointKeys = [
    'point-1',
    'rescaled-point',
    // Add point keys in format splitIdx-expandedResponseGroupIdx-id used in other tests
    '0-0-1', '0-0-2', '0-0-3',
    '1-0-1', '1-0-2', '1-0-3',
    '2-0-1', '2-0-2', '2-0-3'
  ];

  for (const pointKey of commonPointKeys) {
    map.set(pointKey, {
      image: new MockImage() as any as HTMLImageElement,
      offsetToCenter: { x: 5, y: 5 }
    });
  }

  return map;
}

/**
 * Create a mock VisualizationUpdateEvent for testing
 * 
 * @param overrides - Optional property overrides
 */
export function createMockVisualizationUpdateEvent(overrides?: Partial<VisualizationUpdateEvent>): VisualizationUpdateEvent {
  return {
    visualizationId: 'test-viz-1',
    fromSequence: 1,
    toSequence: 2,
    splits: [
      createMockSplit(0),
      createMockSplit(1),
      createMockSplit(2)
    ],
    basisSplitIndices: [0, 1, 2],
    timestamp: '2026-01-07T00:01:00Z',
    ...overrides
  };
}

/**
 * Default test fixtures - use these for most tests
 */
export const defaultFixtures = {
  visualizationData: createMockVisualizationData(),
  vizRenderConfig: createMockVizRenderConfig(),
  loadedImages: createMockLoadedImages()
};
