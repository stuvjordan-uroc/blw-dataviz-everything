import { Point } from 'shared-types';

/**
 * Generate a stable unique key for a Point.
 * Used as the key in PointDisplay Maps for efficient lookups.
 * 
 * Format: "{splitIdx}-{expandedResponseGroupIdx}-{id}"
 * Example: "0-1-5" for point with splitIdx=0, expandedResponseGroupIdx=1, id=5
 * 
 * @param point - The point to generate a key for
 * @returns Stable string key
 */
export function pointKey(point: Point): string {
  return `${point.splitIdx}-${point.expandedResponseGroupIdx}-${point.id}`;
}
