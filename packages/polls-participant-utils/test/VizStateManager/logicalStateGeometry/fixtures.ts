/**
 * Test fixtures for geometric validation tests
 */

import { createMockVisualizationData } from '../fixtures';
import { MockImage } from '../mocks';
import type { SplitWithSegmentGroup, VisualizationData } from 'shared-types';
import type { PointLoadedImage } from '../../../src/types';
import type { VizData, CanvasData } from '../../../src/VizStateManager/types';

export interface GeometryTestFixture {
  vizData: VisualizationData;
  canvasData: CanvasData;
  loadedImages: Map<string, PointLoadedImage>;
}

/**
 * Create a simple fixture with 1 segment group and 2 segments
 */
export function createSimpleFixture(): GeometryTestFixture {
  const splits: SplitWithSegmentGroup[] = [
    {
      basisSplitIndices: [0],
      groups: [],
      totalWeight: 100,
      totalCount: 100,
      segmentGroupBounds: { x: 0, y: 0, width: 800, height: 600 },
      points: [[], []],
      responseGroups: {
        expanded: [
          {
            label: 'Option A',
            values: [0],
            totalCount: 50,
            totalWeight: 50,
            proportion: 0.5,
            bounds: { x: 0, y: 0, width: 390, height: 600 },
            pointPositions: [
              { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }, x: 100, y: 100 },
              { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 2 }, x: 200, y: 200 }
            ],
            pointImage: {
              svgDataURL: 'data:image/svg+xml;base64,EXPANDED0',
              offsetToCenter: { x: 5, y: 5 }
            }
          },
          {
            label: 'Option B',
            values: [1],
            totalCount: 50,
            totalWeight: 50,
            proportion: 0.5,
            bounds: { x: 400, y: 0, width: 390, height: 600 },
            pointPositions: [
              { point: { splitIdx: 0, expandedResponseGroupIdx: 1, id: 3 }, x: 100, y: 100 }
            ],
            pointImage: {
              svgDataURL: 'data:image/svg+xml;base64,EXPANDED1',
              offsetToCenter: { x: 5, y: 5 }
            }
          }
        ],
        collapsed: [
          {
            label: 'All',
            values: [0, 1],
            totalCount: 100,
            totalWeight: 100,
            proportion: 1.0,
            bounds: { x: 0, y: 0, width: 790, height: 600 },
            pointPositions: [
              { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }, x: 100, y: 100 },
              { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 2 }, x: 200, y: 200 },
              { point: { splitIdx: 0, expandedResponseGroupIdx: 1, id: 3 }, x: 500, y: 300 }
            ],
            pointImage: {
              svgDataURL: 'data:image/svg+xml;base64,COLLAPSED0',
              offsetToCenter: { x: 7, y: 7 }
            }
          }
        ]
      }
    }
  ];

  const vizData = createMockVisualizationData({
    splits,
    basisSplitIndices: [0],
    viewMaps: { '': [0] },
    vizWidth: 800,
    vizHeight: 600
  });

  const loadedImages = new Map<string, PointLoadedImage>();
  loadedImages.set('data:image/svg+xml;base64,EXPANDED0', {
    image: new MockImage() as any,
    offsetToCenter: { x: 5, y: 5 }
  });
  loadedImages.set('data:image/svg+xml;base64,EXPANDED1', {
    image: new MockImage() as any,
    offsetToCenter: { x: 5, y: 5 }
  });
  loadedImages.set('data:image/svg+xml;base64,COLLAPSED0', {
    image: new MockImage() as any,
    offsetToCenter: { x: 7, y: 7 }
  });

  const canvasData = {
    element: {} as any,
    context: {} as any,
    pixelWidth: 800,
    pixelHeight: 600,
    margin: { x: 0, y: 0 }
  };

  return { vizData, canvasData, loadedImages };
}

/**
 * Create a complex fixture with 2x2 grid (4 segment groups)
 */
export function createComplexFixture(): GeometryTestFixture {
  const groupGap = 20;
  const vizWidth = 1000;
  const vizHeight = 800;

  // Each segment group is (vizWidth - groupGap) / 2 wide and (vizHeight - groupGap) / 2 tall
  const sgWidth = (vizWidth - groupGap) / 2; // 490
  const sgHeight = (vizHeight - groupGap) / 2; // 390

  const splits: SplitWithSegmentGroup[] = [
    // Top-left (0, 0)
    {
      basisSplitIndices: [0],
      groups: [],
      totalWeight: 100,
      totalCount: 100,
      segmentGroupBounds: { x: 0, y: 0, width: sgWidth, height: sgHeight },
      points: [[], []],
      responseGroups: {
        expanded: [
          {
            label: 'A1',
            values: [0],
            totalCount: 60,
            totalWeight: 60,
            proportion: 0.6,
            bounds: { x: 0, y: 0, width: 280, height: sgHeight },
            pointPositions: [
              { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }, x: 50, y: 50 }
            ],
            pointImage: { svgDataURL: 'split0-exp0', offsetToCenter: { x: 5, y: 5 } }
          },
          {
            label: 'A2',
            values: [1],
            totalCount: 40,
            totalWeight: 40,
            proportion: 0.4,
            bounds: { x: 290, y: 0, width: 190, height: sgHeight },
            pointPositions: [
              { point: { splitIdx: 0, expandedResponseGroupIdx: 1, id: 2 }, x: 50, y: 50 }
            ],
            pointImage: { svgDataURL: 'split0-exp1', offsetToCenter: { x: 5, y: 5 } }
          }
        ],
        collapsed: [
          {
            label: 'All',
            values: [0, 1],
            totalCount: 100,
            totalWeight: 100,
            proportion: 1.0,
            bounds: { x: 0, y: 0, width: 480, height: sgHeight },
            pointPositions: [
              { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }, x: 50, y: 50 },
              { point: { splitIdx: 0, expandedResponseGroupIdx: 1, id: 2 }, x: 300, y: 50 }
            ],
            pointImage: { svgDataURL: 'split0-col0', offsetToCenter: { x: 7, y: 7 } }
          }
        ]
      }
    },
    // Top-right (1, 0)
    {
      basisSplitIndices: [1],
      groups: [],
      totalWeight: 100,
      totalCount: 100,
      segmentGroupBounds: { x: sgWidth + groupGap, y: 0, width: sgWidth, height: sgHeight },
      points: [[], []],
      responseGroups: {
        expanded: [
          {
            label: 'B1',
            values: [0],
            totalCount: 70,
            totalWeight: 70,
            proportion: 0.7,
            bounds: { x: 0, y: 0, width: 320, height: sgHeight },
            pointPositions: [
              { point: { splitIdx: 1, expandedResponseGroupIdx: 0, id: 3 }, x: 50, y: 50 }
            ],
            pointImage: { svgDataURL: 'split1-exp0', offsetToCenter: { x: 5, y: 5 } }
          },
          {
            label: 'B2',
            values: [1],
            totalCount: 30,
            totalWeight: 30,
            proportion: 0.3,
            bounds: { x: 330, y: 0, width: 150, height: sgHeight },
            pointPositions: [
              { point: { splitIdx: 1, expandedResponseGroupIdx: 1, id: 4 }, x: 50, y: 50 }
            ],
            pointImage: { svgDataURL: 'split1-exp1', offsetToCenter: { x: 5, y: 5 } }
          }
        ],
        collapsed: [
          {
            label: 'All',
            values: [0, 1],
            totalCount: 100,
            totalWeight: 100,
            proportion: 1.0,
            bounds: { x: 0, y: 0, width: 480, height: sgHeight },
            pointPositions: [
              { point: { splitIdx: 1, expandedResponseGroupIdx: 0, id: 3 }, x: 50, y: 50 },
              { point: { splitIdx: 1, expandedResponseGroupIdx: 1, id: 4 }, x: 300, y: 50 }
            ],
            pointImage: { svgDataURL: 'split1-col0', offsetToCenter: { x: 7, y: 7 } }
          }
        ]
      }
    },
    // Bottom-left (0, 1)
    {
      basisSplitIndices: [2],
      groups: [],
      totalWeight: 100,
      totalCount: 100,
      segmentGroupBounds: { x: 0, y: sgHeight + groupGap, width: sgWidth, height: sgHeight },
      points: [[], []],
      responseGroups: {
        expanded: [
          {
            label: 'C1',
            values: [0],
            totalCount: 50,
            totalWeight: 50,
            proportion: 0.5,
            bounds: { x: 0, y: 0, width: 235, height: sgHeight },
            pointPositions: [
              { point: { splitIdx: 2, expandedResponseGroupIdx: 0, id: 5 }, x: 50, y: 50 }
            ],
            pointImage: { svgDataURL: 'split2-exp0', offsetToCenter: { x: 5, y: 5 } }
          },
          {
            label: 'C2',
            values: [1],
            totalCount: 50,
            totalWeight: 50,
            proportion: 0.5,
            bounds: { x: 245, y: 0, width: 235, height: sgHeight },
            pointPositions: [
              { point: { splitIdx: 2, expandedResponseGroupIdx: 1, id: 6 }, x: 50, y: 50 }
            ],
            pointImage: { svgDataURL: 'split2-exp1', offsetToCenter: { x: 5, y: 5 } }
          }
        ],
        collapsed: [
          {
            label: 'All',
            values: [0, 1],
            totalCount: 100,
            totalWeight: 100,
            proportion: 1.0,
            bounds: { x: 0, y: 0, width: 480, height: sgHeight },
            pointPositions: [
              { point: { splitIdx: 2, expandedResponseGroupIdx: 0, id: 5 }, x: 50, y: 50 },
              { point: { splitIdx: 2, expandedResponseGroupIdx: 1, id: 6 }, x: 300, y: 50 }
            ],
            pointImage: { svgDataURL: 'split2-col0', offsetToCenter: { x: 7, y: 7 } }
          }
        ]
      }
    },
    // Bottom-right (1, 1)
    {
      basisSplitIndices: [3],
      groups: [],
      totalWeight: 100,
      totalCount: 100,
      segmentGroupBounds: { x: sgWidth + groupGap, y: sgHeight + groupGap, width: sgWidth, height: sgHeight },
      points: [[], []],
      responseGroups: {
        expanded: [
          {
            label: 'D1',
            values: [0],
            totalCount: 80,
            totalWeight: 80,
            proportion: 0.8,
            bounds: { x: 0, y: 0, width: 370, height: sgHeight },
            pointPositions: [
              { point: { splitIdx: 3, expandedResponseGroupIdx: 0, id: 7 }, x: 50, y: 50 }
            ],
            pointImage: { svgDataURL: 'split3-exp0', offsetToCenter: { x: 5, y: 5 } }
          },
          {
            label: 'D2',
            values: [1],
            totalCount: 20,
            totalWeight: 20,
            proportion: 0.2,
            bounds: { x: 380, y: 0, width: 100, height: sgHeight },
            pointPositions: [
              { point: { splitIdx: 3, expandedResponseGroupIdx: 1, id: 8 }, x: 50, y: 50 }
            ],
            pointImage: { svgDataURL: 'split3-exp1', offsetToCenter: { x: 5, y: 5 } }
          }
        ],
        collapsed: [
          {
            label: 'All',
            values: [0, 1],
            totalCount: 100,
            totalWeight: 100,
            proportion: 1.0,
            bounds: { x: 0, y: 0, width: 480, height: sgHeight },
            pointPositions: [
              { point: { splitIdx: 3, expandedResponseGroupIdx: 0, id: 7 }, x: 50, y: 50 },
              { point: { splitIdx: 3, expandedResponseGroupIdx: 1, id: 8 }, x: 300, y: 50 }
            ],
            pointImage: { svgDataURL: 'split3-col0', offsetToCenter: { x: 7, y: 7 } }
          }
        ]
      }
    }
  ];

  const vizData = createMockVisualizationData({
    splits,
    basisSplitIndices: [0, 1, 2, 3],
    viewMaps: {
      '': [0, 1, 2, 3],
      'view1': [0, 1],  // Top row only
      'view2': [2, 3]   // Bottom row only
    },
    vizWidth,
    vizHeight
  });

  const loadedImages = new Map<string, PointLoadedImage>();
  const imageKeys = [
    'split0-exp0', 'split0-exp1', 'split0-col0',
    'split1-exp0', 'split1-exp1', 'split1-col0',
    'split2-exp0', 'split2-exp1', 'split2-col0',
    'split3-exp0', 'split3-exp1', 'split3-col0'
  ];
  imageKeys.forEach(key => {
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
