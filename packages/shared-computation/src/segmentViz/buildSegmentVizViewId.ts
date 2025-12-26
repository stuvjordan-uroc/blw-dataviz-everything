/**
 * Build a viewId string for segment visualization from active question indices.
 * 
 * This encodes the mapping from user selections to view identifiers.
 * The viewId format is a comma-separated list of flattened question indices,
 * where x-axis questions occupy indices [0..n-1] and y-axis questions occupy [n..end].
 * 
 * IMPORTANT: This function is the single source of truth for viewId generation.
 * It's used both during initialization (to build viewMaps) and by client code
 * (to convert user checkbox selections to viewIds). Any changes here automatically
 * propagate to both contexts.
 * 
 * @param activeXIndices - Indices of active x-axis grouping questions (0-based)
 * @param activeYIndices - Indices of active y-axis grouping questions (0-based)
 * @param numXQuestions - Total number of x-axis grouping questions (for offset calculation)
 * @returns viewId string (e.g., "0,1,3" or "" for base view)
 * 
 * @example
 * // If you have 2 x-questions and 3 y-questions:
 * buildSegmentVizViewId([0], [1], 2)  // "0,3" (x[0] and y[1])
 * buildSegmentVizViewId([], [], 2)     // "" (base view - no active questions)
 * buildSegmentVizViewId([0,1], [0,2], 2) // "0,1,2,4" (both x's, y[0] and y[2])
 */
export function buildSegmentVizViewId(
  activeXIndices: number[],
  activeYIndices: number[],
  numXQuestions: number
): string {

  //sort the passed indices to guarantee that we always
  //use sorted indices as keys
  const sortedX = [...activeXIndices].sort((a, b) => a - b);
  const sortedY = [...activeYIndices].sort((a, b) => a - b);

  // Flatten indices: x-questions stay as-is, y-questions offset by numXQuestions
  // Note: Already in sorted order since all x-indices < numXQuestions <= all y-indices
  const flattened = [
    ...sortedX,
    ...sortedY.map(idx => idx + numXQuestions)
  ];

  return flattened.join(',');
}
