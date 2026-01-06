/**
 * Tests for loadVizImages
 * 
 * Focus: Testing that loadVizImages correctly identifies all unique SVG data URLs
 * from SplitWithSegmentGroup objects and creates a PointLoadedImage for each.
 */

import { loadVizImages } from '../src/loadVizImages';
import { rasterizeSvgDataUrl } from '../src/loadVizImages/rasterizeSvgDataUrl';
import type { SplitWithSegmentGroup } from 'shared-types';

// Mock rasterizeSvgDataUrl
jest.mock('../src/loadVizImages/rasterizeSvgDataUrl');

// Mock HTMLImageElement for Node.js environment
class MockImage {
  src: string = '';
  width: number = 100;
  height: number = 100;
}

describe('loadVizImages', () => {
  const mockRasterizeSvgDataUrl = rasterizeSvgDataUrl as jest.MockedFunction<typeof rasterizeSvgDataUrl>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock returns a fake HTMLImageElement
    mockRasterizeSvgDataUrl.mockImplementation(async (url: string) => {
      const img = new MockImage();
      img.src = url;
      return img as any as HTMLImageElement;
    });
  });

  /**
   * Fixture: Array of SplitWithSegmentGroup with various SVG data URLs
   * 
   * This fixture includes:
   * - Multiple splits
   * - Both expanded and collapsed response groups
   * - Some duplicate SVG URLs (should only load once)
   * - Different offset values for same URL (should use first encountered)
   */
  const mockSplits: SplitWithSegmentGroup[] = [
    {
      basisSplitIndices: [0],
      groups: [],
      totalWeight: 100,
      totalCount: 100,
      segmentGroupBounds: { x: 0, y: 0, width: 800, height: 600 },
      points: [[]],
      responseGroups: {
        expanded: [
          {
            label: 'Option A',
            values: [0],
            totalCount: 50,
            totalWeight: 50,
            proportion: 0.5,
            bounds: { x: 0, y: 0, width: 100, height: 100 },
            pointPositions: [],
            pointImage: {
              svgDataURL: 'data:image/svg+xml;base64,AAAAA', // URL 1
              offsetToCenter: { x: 10, y: 10 }
            }
          },
          {
            label: 'Option B',
            values: [1],
            totalCount: 50,
            totalWeight: 50,
            proportion: 0.5,
            bounds: { x: 100, y: 0, width: 100, height: 100 },
            pointPositions: [],
            pointImage: {
              svgDataURL: 'data:image/svg+xml;base64,BBBBB', // URL 2
              offsetToCenter: { x: 12, y: 12 }
            }
          }
        ],
        collapsed: [
          {
            label: 'All Options',
            values: [0, 1],
            totalCount: 100,
            totalWeight: 100,
            proportion: 1.0,
            bounds: { x: 0, y: 0, width: 200, height: 100 },
            pointPositions: [],
            pointImage: {
              svgDataURL: 'data:image/svg+xml;base64,CCCCC', // URL 3
              offsetToCenter: { x: 15, y: 15 }
            }
          }
        ]
      }
    },
    {
      basisSplitIndices: [1],
      groups: [
        {
          question: { varName: 'gender', batteryName: 'demo', subBattery: '' },
          responseGroup: { label: 'Male', values: [0] }
        }
      ],
      totalWeight: 50,
      totalCount: 50,
      segmentGroupBounds: { x: 0, y: 200, width: 800, height: 600 },
      points: [[]],
      responseGroups: {
        expanded: [
          {
            label: 'Option A',
            values: [0],
            totalCount: 25,
            totalWeight: 25,
            proportion: 0.5,
            bounds: { x: 0, y: 200, width: 100, height: 100 },
            pointPositions: [],
            pointImage: {
              svgDataURL: 'data:image/svg+xml;base64,AAAAA', // URL 1 (duplicate!)
              offsetToCenter: { x: 10, y: 10 }
            }
          },
          {
            label: 'Option B',
            values: [1],
            totalCount: 25,
            totalWeight: 25,
            proportion: 0.5,
            bounds: { x: 100, y: 200, width: 100, height: 100 },
            pointPositions: [],
            pointImage: {
              svgDataURL: 'data:image/svg+xml;base64,DDDDD', // URL 4
              offsetToCenter: { x: 14, y: 14 }
            }
          }
        ],
        collapsed: [
          {
            label: 'All Options',
            values: [0, 1],
            totalCount: 50,
            totalWeight: 50,
            proportion: 1.0,
            bounds: { x: 0, y: 200, width: 200, height: 100 },
            pointPositions: [],
            pointImage: {
              svgDataURL: 'data:image/svg+xml;base64,BBBBB', // URL 2 (duplicate!)
              offsetToCenter: { x: 12, y: 12 }
            }
          }
        ]
      }
    }
  ];

  it('should create a PointLoadedImage for each unique SVG data URL', async () => {
    const result = await loadVizImages(mockSplits);

    // Should have exactly 4 unique URLs (AAAAA, BBBBB, CCCCC, DDDDD)
    expect(result.size).toBe(4);

    // Verify each unique URL is present
    expect(result.has('data:image/svg+xml;base64,AAAAA')).toBe(true);
    expect(result.has('data:image/svg+xml;base64,BBBBB')).toBe(true);
    expect(result.has('data:image/svg+xml;base64,CCCCC')).toBe(true);
    expect(result.has('data:image/svg+xml;base64,DDDDD')).toBe(true);
  });

  it('should call rasterizeSvgDataUrl once per unique URL', async () => {
    await loadVizImages(mockSplits);

    // Should be called exactly 4 times (once per unique URL)
    expect(mockRasterizeSvgDataUrl).toHaveBeenCalledTimes(4);

    // Verify it was called with each unique URL
    expect(mockRasterizeSvgDataUrl).toHaveBeenCalledWith('data:image/svg+xml;base64,AAAAA');
    expect(mockRasterizeSvgDataUrl).toHaveBeenCalledWith('data:image/svg+xml;base64,BBBBB');
    expect(mockRasterizeSvgDataUrl).toHaveBeenCalledWith('data:image/svg+xml;base64,CCCCC');
    expect(mockRasterizeSvgDataUrl).toHaveBeenCalledWith('data:image/svg+xml;base64,DDDDD');
  });

  it('should include correct offsetToCenter for each image', async () => {
    const result = await loadVizImages(mockSplits);

    // Verify offset for each URL matches the first occurrence in the fixture
    const imageA = result.get('data:image/svg+xml;base64,AAAAA');
    expect(imageA?.offsetToCenter).toEqual({ x: 10, y: 10 });

    const imageB = result.get('data:image/svg+xml;base64,BBBBB');
    expect(imageB?.offsetToCenter).toEqual({ x: 12, y: 12 });

    const imageC = result.get('data:image/svg+xml;base64,CCCCC');
    expect(imageC?.offsetToCenter).toEqual({ x: 15, y: 15 });

    const imageD = result.get('data:image/svg+xml;base64,DDDDD');
    expect(imageD?.offsetToCenter).toEqual({ x: 14, y: 14 });
  });

  it('should include the rasterized image for each URL', async () => {
    const result = await loadVizImages(mockSplits);

    // Each entry should have an 'image' property
    for (const [url, pointImage] of result.entries()) {
      expect(pointImage.image).toBeDefined();
      expect(pointImage.image.src).toBe(url);
    }
  });

  it('should handle empty splits array', async () => {
    const result = await loadVizImages([]);

    expect(result.size).toBe(0);
    expect(mockRasterizeSvgDataUrl).not.toHaveBeenCalled();
  });

  it('should extract URLs from both expanded and collapsed response groups', async () => {
    // Create a split with only collapsed groups
    const splitsWithCollapsedOnly: SplitWithSegmentGroup[] = [
      {
        basisSplitIndices: [0],
        groups: [],
        totalWeight: 100,
        totalCount: 100,
        segmentGroupBounds: { x: 0, y: 0, width: 800, height: 600 },
        points: [[]],
        responseGroups: {
          expanded: [], // No expanded groups
          collapsed: [
            {
              label: 'Collapsed Only',
              values: [0],
              totalCount: 100,
              totalWeight: 100,
              proportion: 1.0,
              bounds: { x: 0, y: 0, width: 200, height: 100 },
              pointPositions: [],
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,COLLAPSED',
                offsetToCenter: { x: 20, y: 20 }
              }
            }
          ]
        }
      }
    ];

    const result = await loadVizImages(splitsWithCollapsedOnly);

    expect(result.size).toBe(1);
    expect(result.has('data:image/svg+xml;base64,COLLAPSED')).toBe(true);
  });
});
