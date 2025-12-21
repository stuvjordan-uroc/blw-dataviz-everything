import { positionPointsInSegment, positionNewPointsAmongExisting } from '../../src/segmentViz/geometry';
import type { Point, PointPosition } from '../../src/segmentViz/types';

/**
 * Helper to create test points
 */
function createPoints(count: number, prefix: string = 'point'): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    responseId: `response-${i}`
  }));
}

/**
 * Helper to verify all positions are within bounds
 */
function expectAllPointsWithinBounds(
  positions: PointPosition[],
  bounds: { x: number; y: number; width: number; height: number }
) {
  positions.forEach((pos, idx) => {
    expect(pos.x).toBeGreaterThanOrEqual(bounds.x);
    expect(pos.x).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(pos.y).toBeGreaterThanOrEqual(bounds.y);
    expect(pos.y).toBeLessThanOrEqual(bounds.y + bounds.height);
  });
}

describe('positionPointsInSegment', () => {
  describe('point placement within bounds', () => {
    test('places all points within segment bounds for small segment', () => {
      const points = createPoints(5);
      const segmentBounds = { x: 10, y: 20, width: 30, height: 40 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(5);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });

    test('places all points within segment bounds for large segment', () => {
      const points = createPoints(20);
      const segmentBounds = { x: 0, y: 0, width: 500, height: 400 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(20);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });

    test('places all points within segment bounds for narrow segment', () => {
      const points = createPoints(8);
      const segmentBounds = { x: 50, y: 100, width: 20, height: 200 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(8);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });

    test('places all points within segment bounds for tall segment', () => {
      const points = createPoints(10);
      const segmentBounds = { x: 100, y: 50, width: 200, height: 20 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(10);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });
  });

  describe('with different numbers of points', () => {
    test('handles single point', () => {
      const points = createPoints(1);
      const segmentBounds = { x: 0, y: 0, width: 100, height: 100 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(1);
      expect(positions[0].point).toBe(points[0]);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });

    test('handles 10 points', () => {
      const points = createPoints(10);
      const segmentBounds = { x: 0, y: 0, width: 150, height: 150 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(10);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });

    test('handles 50 points', () => {
      const points = createPoints(50);
      const segmentBounds = { x: 0, y: 0, width: 300, height: 300 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(50);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });

    test('handles 100 points', () => {
      const points = createPoints(100);
      const segmentBounds = { x: 0, y: 0, width: 400, height: 400 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(100);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });
  });

  describe('with different segment sizes', () => {
    test('handles very small segment (edge case)', () => {
      const points = createPoints(5);
      const segmentBounds = { x: 0, y: 0, width: 5, height: 5 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(5);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });

    test('handles square segment', () => {
      const points = createPoints(15);
      const segmentBounds = { x: 0, y: 0, width: 100, height: 100 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(15);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });

    test('handles wide segment', () => {
      const points = createPoints(12);
      const segmentBounds = { x: 0, y: 0, width: 300, height: 50 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(12);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });

    test('handles tall segment', () => {
      const points = createPoints(12);
      const segmentBounds = { x: 0, y: 0, width: 50, height: 300 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(12);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });

    test('handles very large segment', () => {
      const points = createPoints(25);
      const segmentBounds = { x: 0, y: 0, width: 1000, height: 800 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(25);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });
  });

  describe('edge cases', () => {
    test('handles empty points array', () => {
      const points: Point[] = [];
      const segmentBounds = { x: 0, y: 0, width: 100, height: 100 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(0);
      expect(positions).toEqual([]);
    });

    test('handles segment with zero width', () => {
      const points = createPoints(3);
      const segmentBounds = { x: 50, y: 50, width: 0, height: 100 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(3);
      // Should place all points at center of segment
      positions.forEach(pos => {
        expect(pos.x).toBe(50);
        expect(pos.y).toBeGreaterThanOrEqual(50);
        expect(pos.y).toBeLessThanOrEqual(150);
      });
    });

    test('handles segment with zero height', () => {
      const points = createPoints(3);
      const segmentBounds = { x: 50, y: 50, width: 100, height: 0 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(3);
      // Should place all points at center of segment
      positions.forEach(pos => {
        expect(pos.x).toBeGreaterThanOrEqual(50);
        expect(pos.x).toBeLessThanOrEqual(150);
        expect(pos.y).toBe(50);
      });
    });
  });

  describe('point ID preservation', () => {
    test('preserves point objects in returned positions', () => {
      const points = createPoints(5);
      const segmentBounds = { x: 0, y: 0, width: 100, height: 100 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(5);
      // Verify each position references the exact same point object
      positions.forEach((pos, idx) => {
        expect(pos.point).toBe(points[idx]);
        expect(pos.point.id).toBe(points[idx].id);
      });
    });

    test('maintains order of points in result', () => {
      const points = createPoints(8);
      const segmentBounds = { x: 0, y: 0, width: 150, height: 150 };

      const positions = positionPointsInSegment(points, segmentBounds);

      expect(positions).toHaveLength(8);
      // Points should appear in same order as input
      positions.forEach((pos, idx) => {
        expect(pos.point.id).toBe(`point-${idx}`);
      });
    });
  });
});

describe('positionNewPointsAmongExisting', () => {
  describe('adding points to empty segment', () => {
    test('places all new points within bounds when no existing points', () => {
      const addedPoints = createPoints(5, 'new');
      const segmentBounds = { x: 0, y: 0, width: 100, height: 100 };

      const positions = positionNewPointsAmongExisting([], [], addedPoints, segmentBounds);

      expect(positions).toHaveLength(5);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });

    test('handles adding single point to empty segment', () => {
      const addedPoints = createPoints(1, 'new');
      const segmentBounds = { x: 10, y: 10, width: 80, height: 80 };

      const positions = positionNewPointsAmongExisting([], [], addedPoints, segmentBounds);

      expect(positions).toHaveLength(1);
      expect(positions[0].point).toBe(addedPoints[0]);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });

    test('handles adding multiple points to empty segment', () => {
      const addedPoints = createPoints(10, 'new');
      const segmentBounds = { x: 0, y: 0, width: 150, height: 150 };

      const positions = positionNewPointsAmongExisting([], [], addedPoints, segmentBounds);

      expect(positions).toHaveLength(10);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });
  });

  describe('adding points among existing points', () => {
    test('preserves existing point positions', () => {
      const existingPoints = createPoints(3, 'existing');
      const segmentBounds = { x: 0, y: 0, width: 100, height: 100 };

      // Create initial positions
      const existingPositions: PointPosition[] = [
        { point: existingPoints[0], x: 20, y: 30 },
        { point: existingPoints[1], x: 50, y: 60 },
        { point: existingPoints[2], x: 80, y: 40 }
      ];

      const addedPoints = createPoints(2, 'new');

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        [],
        addedPoints,
        segmentBounds
      );

      // Should have 3 existing + 2 new = 5 total
      expect(positions).toHaveLength(5);

      // Verify existing positions are preserved exactly
      const existingInResult = positions.filter(p => p.point.id.startsWith('existing'));
      expect(existingInResult).toHaveLength(3);
      expect(existingInResult[0]).toEqual({ point: existingPoints[0], x: 20, y: 30 });
      expect(existingInResult[1]).toEqual({ point: existingPoints[1], x: 50, y: 60 });
      expect(existingInResult[2]).toEqual({ point: existingPoints[2], x: 80, y: 40 });
    });

    test('places new points within bounds', () => {
      const existingPoints = createPoints(2, 'existing');
      const existingPositions: PointPosition[] = [
        { point: existingPoints[0], x: 30, y: 40 },
        { point: existingPoints[1], x: 70, y: 60 }
      ];

      const addedPoints = createPoints(3, 'new');
      const segmentBounds = { x: 0, y: 0, width: 120, height: 120 };

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        [],
        addedPoints,
        segmentBounds
      );

      expect(positions).toHaveLength(5);
      expectAllPointsWithinBounds(positions, segmentBounds);

      // Verify new points are present
      const newInResult = positions.filter(p => p.point.id.startsWith('new'));
      expect(newInResult).toHaveLength(3);
    });

    test('returns combined set of existing and new points', () => {
      const existingPoints = createPoints(4, 'existing');
      const existingPositions: PointPosition[] = existingPoints.map((p, i) => ({
        point: p,
        x: 10 + i * 20,
        y: 10 + i * 20
      }));

      const addedPoints = createPoints(3, 'new');
      const segmentBounds = { x: 0, y: 0, width: 150, height: 150 };

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        [],
        addedPoints,
        segmentBounds
      );

      // Should have all 7 points
      expect(positions).toHaveLength(7);

      // Verify all existing points are present
      existingPoints.forEach(existingPoint => {
        expect(positions.some(p => p.point.id === existingPoint.id)).toBe(true);
      });

      // Verify all new points are present
      addedPoints.forEach(newPoint => {
        expect(positions.some(p => p.point.id === newPoint.id)).toBe(true);
      });
    });
  });

  describe('removing points', () => {
    test('removes specified points from existing positions', () => {
      const existingPoints = createPoints(5, 'existing');
      const existingPositions: PointPosition[] = existingPoints.map((p, i) => ({
        point: p,
        x: 10 + i * 15,
        y: 10 + i * 15
      }));

      const removedPoints = [existingPoints[1], existingPoints[3]]; // Remove points 1 and 3
      const segmentBounds = { x: 0, y: 0, width: 100, height: 100 };

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        removedPoints,
        [],
        segmentBounds
      );

      // Should have 5 - 2 = 3 points
      expect(positions).toHaveLength(3);

      // Verify removed points are NOT in result
      expect(positions.some(p => p.point.id === 'existing-1')).toBe(false);
      expect(positions.some(p => p.point.id === 'existing-3')).toBe(false);

      // Verify remaining points ARE in result
      expect(positions.some(p => p.point.id === 'existing-0')).toBe(true);
      expect(positions.some(p => p.point.id === 'existing-2')).toBe(true);
      expect(positions.some(p => p.point.id === 'existing-4')).toBe(true);
    });

    test('preserves non-removed existing points', () => {
      const existingPoints = createPoints(4, 'existing');
      const existingPositions: PointPosition[] = [
        { point: existingPoints[0], x: 20, y: 30 },
        { point: existingPoints[1], x: 40, y: 50 },
        { point: existingPoints[2], x: 60, y: 70 },
        { point: existingPoints[3], x: 80, y: 90 }
      ];

      const removedPoints = [existingPoints[2]]; // Remove only point 2
      const segmentBounds = { x: 0, y: 0, width: 100, height: 100 };

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        removedPoints,
        [],
        segmentBounds
      );

      expect(positions).toHaveLength(3);

      // Verify non-removed points preserve exact positions
      const point0 = positions.find(p => p.point.id === 'existing-0');
      expect(point0).toEqual({ point: existingPoints[0], x: 20, y: 30 });

      const point1 = positions.find(p => p.point.id === 'existing-1');
      expect(point1).toEqual({ point: existingPoints[1], x: 40, y: 50 });

      const point3 = positions.find(p => p.point.id === 'existing-3');
      expect(point3).toEqual({ point: existingPoints[3], x: 80, y: 90 });
    });

    test('handles removing all existing points', () => {
      const existingPoints = createPoints(3, 'existing');
      const existingPositions: PointPosition[] = existingPoints.map((p, i) => ({
        point: p,
        x: 20 + i * 20,
        y: 20 + i * 20
      }));

      const removedPoints = existingPoints; // Remove all
      const segmentBounds = { x: 0, y: 0, width: 100, height: 100 };

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        removedPoints,
        [],
        segmentBounds
      );

      expect(positions).toHaveLength(0);
      expect(positions).toEqual([]);
    });

    test('handles empty removed points array', () => {
      const existingPoints = createPoints(3, 'existing');
      const existingPositions: PointPosition[] = existingPoints.map((p, i) => ({
        point: p,
        x: 20 + i * 20,
        y: 20 + i * 20
      }));

      const segmentBounds = { x: 0, y: 0, width: 100, height: 100 };

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        [],
        [],
        segmentBounds
      );

      // Should preserve all existing points
      expect(positions).toHaveLength(3);
      expect(positions).toEqual(existingPositions);
    });
  });

  describe('removing and adding simultaneously', () => {
    test('removes specified points and adds new points', () => {
      const existingPoints = createPoints(4, 'existing');
      const existingPositions: PointPosition[] = existingPoints.map((p, i) => ({
        point: p,
        x: 15 + i * 20,
        y: 15 + i * 20
      }));

      const removedPoints = [existingPoints[1], existingPoints[2]];
      const addedPoints = createPoints(3, 'new');
      const segmentBounds = { x: 0, y: 0, width: 120, height: 120 };

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        removedPoints,
        addedPoints,
        segmentBounds
      );

      // Should have (4 - 2) + 3 = 5 points
      expect(positions).toHaveLength(5);

      // Verify removed points are gone
      expect(positions.some(p => p.point.id === 'existing-1')).toBe(false);
      expect(positions.some(p => p.point.id === 'existing-2')).toBe(false);

      // Verify retained points are present
      expect(positions.some(p => p.point.id === 'existing-0')).toBe(true);
      expect(positions.some(p => p.point.id === 'existing-3')).toBe(true);

      // Verify new points are present
      expect(positions.some(p => p.point.id === 'new-0')).toBe(true);
      expect(positions.some(p => p.point.id === 'new-1')).toBe(true);
      expect(positions.some(p => p.point.id === 'new-2')).toBe(true);
    });

    test('handles removing some points and adding others', () => {
      const existingPoints = createPoints(6, 'existing');
      const existingPositions: PointPosition[] = existingPoints.map((p, i) => ({
        point: p,
        x: 10 + i * 15,
        y: 10 + i * 15
      }));

      const removedPoints = [existingPoints[0], existingPoints[5]];
      const addedPoints = createPoints(2, 'new');
      const segmentBounds = { x: 0, y: 0, width: 150, height: 150 };

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        removedPoints,
        addedPoints,
        segmentBounds
      );

      // Should have (6 - 2) + 2 = 6 points
      expect(positions).toHaveLength(6);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });

    test('handles replacing all points (remove all, add new)', () => {
      const existingPoints = createPoints(3, 'existing');
      const existingPositions: PointPosition[] = existingPoints.map((p, i) => ({
        point: p,
        x: 20 + i * 20,
        y: 20 + i * 20
      }));

      const removedPoints = existingPoints; // Remove all existing
      const addedPoints = createPoints(4, 'new'); // Add new ones
      const segmentBounds = { x: 0, y: 0, width: 100, height: 100 };

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        removedPoints,
        addedPoints,
        segmentBounds
      );

      // Should have only the 4 new points
      expect(positions).toHaveLength(4);

      // No existing points should remain
      expect(positions.some(p => p.point.id.startsWith('existing'))).toBe(false);

      // All new points should be present
      addedPoints.forEach(newPoint => {
        expect(positions.some(p => p.point.id === newPoint.id)).toBe(true);
      });
    });
  });

  describe('with different segment sizes', () => {
    test('handles very small segment with existing points', () => {
      const existingPoints = createPoints(1, 'existing');
      const existingPositions: PointPosition[] = [
        { point: existingPoints[0], x: 10, y: 10 }
      ];

      const addedPoints = createPoints(1, 'new');
      const segmentBounds = { x: 0, y: 0, width: 20, height: 20 };

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        [],
        addedPoints,
        segmentBounds
      );

      // All points should be placed, even in very small segments
      expect(positions).toHaveLength(2); // 1 existing + 1 new
      expectAllPointsWithinBounds(positions, segmentBounds);

      // Verify existing point is preserved
      expect(positions.some(p => p.point.id === 'existing-0')).toBe(true);
      // Verify new point is placed
      expect(positions.some(p => p.point.id === 'new-0')).toBe(true);
    });

    test('handles large segment with many existing points', () => {
      const existingPoints = createPoints(15, 'existing');
      const existingPositions: PointPosition[] = existingPoints.map((p, i) => ({
        point: p,
        x: 50 + (i % 5) * 80,
        y: 50 + Math.floor(i / 5) * 80
      }));

      const addedPoints = createPoints(10, 'new');
      const segmentBounds = { x: 0, y: 0, width: 500, height: 400 };

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        [],
        addedPoints,
        segmentBounds
      );

      expect(positions).toHaveLength(25);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });
  });

  describe('edge cases', () => {
    test('handles no changes (no added, no removed)', () => {
      const existingPoints = createPoints(4, 'existing');
      const existingPositions: PointPosition[] = existingPoints.map((p, i) => ({
        point: p,
        x: 20 + i * 20,
        y: 30 + i * 15
      }));

      const segmentBounds = { x: 0, y: 0, width: 120, height: 120 };

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        [],
        [],
        segmentBounds
      );

      // Should return existing positions unchanged
      expect(positions).toHaveLength(4);
      expect(positions).toEqual(existingPositions);
    });

    test('handles adding points when existing positions is empty', () => {
      const addedPoints = createPoints(5, 'new');
      const segmentBounds = { x: 0, y: 0, width: 100, height: 100 };

      const positions = positionNewPointsAmongExisting(
        [],
        [],
        addedPoints,
        segmentBounds
      );

      expect(positions).toHaveLength(5);
      expectAllPointsWithinBounds(positions, segmentBounds);
    });

    test('handles segment with zero dimensions', () => {
      const existingPoints = createPoints(2, 'existing');
      const existingPositions: PointPosition[] = [
        { point: existingPoints[0], x: 50, y: 50 },
        { point: existingPoints[1], x: 50, y: 50 }
      ];

      const addedPoints = createPoints(2, 'new');
      const segmentBounds = { x: 50, y: 50, width: 0, height: 0 };

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        [],
        addedPoints,
        segmentBounds
      );

      expect(positions).toHaveLength(4);
      // All points should be at center
      positions.forEach(pos => {
        expect(pos.x).toBe(50);
        expect(pos.y).toBe(50);
      });
    });
  });

  describe('point ID preservation', () => {
    test('preserves point IDs for retained points', () => {
      const existingPoints = createPoints(5, 'existing');
      const existingPositions: PointPosition[] = existingPoints.map((p, i) => ({
        point: p,
        x: 10 + i * 20,
        y: 10 + i * 20
      }));

      const removedPoints = [existingPoints[2]];
      const addedPoints = createPoints(2, 'new');
      const segmentBounds = { x: 0, y: 0, width: 150, height: 150 };

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        removedPoints,
        addedPoints,
        segmentBounds
      );

      expect(positions).toHaveLength(6);

      // Verify retained points have correct IDs
      expect(positions.some(p => p.point.id === 'existing-0')).toBe(true);
      expect(positions.some(p => p.point.id === 'existing-1')).toBe(true);
      expect(positions.some(p => p.point.id === 'existing-3')).toBe(true);
      expect(positions.some(p => p.point.id === 'existing-4')).toBe(true);

      // Verify new points have correct IDs
      expect(positions.some(p => p.point.id === 'new-0')).toBe(true);
      expect(positions.some(p => p.point.id === 'new-1')).toBe(true);
    });

    test('includes correct point objects in new positions', () => {
      const existingPoints = createPoints(2, 'existing');
      const existingPositions: PointPosition[] = existingPoints.map((p, i) => ({
        point: p,
        x: 30 + i * 30,
        y: 30 + i * 30
      }));

      const addedPoints = createPoints(3, 'new');
      const segmentBounds = { x: 0, y: 0, width: 120, height: 120 };

      const positions = positionNewPointsAmongExisting(
        existingPositions,
        [],
        addedPoints,
        segmentBounds
      );

      expect(positions).toHaveLength(5);

      // Verify existing point objects are preserved (same reference)
      const existingInResult = positions.filter(p => p.point.id.startsWith('existing'));
      expect(existingInResult[0].point).toBe(existingPoints[0]);
      expect(existingInResult[1].point).toBe(existingPoints[1]);

      // Verify new point objects are included
      const newInResult = positions.filter(p => p.point.id.startsWith('new'));
      newInResult.forEach((pos, idx) => {
        expect(pos.point).toBe(addedPoints[idx]);
      });
    });
  });
});
