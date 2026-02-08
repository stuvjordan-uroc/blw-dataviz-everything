/**
 * Geometry logging utilities for debugging visualization rendering
 * 
 * Captures the final rendered state of visualizations after animations complete,
 * including canvas-pixel coordinates of segment groups, segments, and points.
 * Validates that points are positioned within their parent segment bounds.
 */

import type { SingleSplitVizRef, FullVizRef } from "./DebugWrapper";
import type { RectBounds } from "shared-types";

/**
 * Check if a point position is within rectangular bounds
 */
function isPointInBounds(
  pointX: number,
  pointY: number,
  bounds: RectBounds
): boolean {
  return (
    pointX >= bounds.x &&
    pointX <= bounds.x + bounds.width &&
    pointY >= bounds.y &&
    pointY <= bounds.y + bounds.height
  );
}

/**
 * Logged point data with membership validation
 */
interface LoggedPoint {
  /** Unique key: "basisSplitIdx-expandedRGIdx-id" */
  key: string;
  /** Point identity */
  basisSplitIdx: number;
  expandedRGIdx: number;
  id: number;
  /** Canvas pixel position */
  position: { x: number; y: number };
  /** Is position within parent segment bounds? */
  isInSegmentBounds: boolean;
  /** Is position within parent segment group bounds? */
  isInSegmentGroupBounds: boolean;
}

/**
 * Logged segment data
 */
interface LoggedSegment {
  /** Response group index in current display mode */
  responseGroupIdx: number;
  /** Response group label */
  label: string;
  /** Segment bounds in canvas pixels */
  bounds: RectBounds;
  /** Points that belong to this segment and are valid */
  points: LoggedPoint[];
  /** Points that are outside segment bounds (the bug being hunted) */
  invalidPoints: LoggedPoint[];
}

/**
 * Logged segment group (split) data
 */
interface LoggedSegmentGroup {
  /** Index of this split in the overall splits array */
  renderSplitIdx: number;
  /** Indices of basis splits that aggregate into this split */
  basisSplitIndices: number[];
  /** Segment group bounds in canvas pixels */
  bounds: RectBounds;
  /** Segments within this group */
  segments: LoggedSegment[];
}

/**
 * Complete geometry log for SingleSplitViz
 */
interface SingleSplitGeometryLog {
  componentType: "SingleSplitViz";
  timestamp: string;
  canvas: {
    width: number;
    height: number;
    margin: { x: number; y: number };
    drawableArea: { width: number; height: number };
  };
  displayMode: "expanded" | "collapsed";
  segmentGroup: LoggedSegmentGroup;
}

/**
 * Complete geometry log for FullViz
 */
interface FullVizGeometryLog {
  componentType: "FullViz";
  timestamp: string;
  canvas: {
    width: number;
    height: number;
    margin: { x: number; y: number };
    drawableArea: { width: number; height: number };
  };
  displayMode: "expanded" | "collapsed";
  viewId: string;
  segmentGroups: LoggedSegmentGroup[];
}

/**
 * Log geometry for SingleSplitViz component
 * 
 * Captures single segment group with all segments and points in canvas pixel coordinates.
 * Validates point positions against segment and segment group bounds.
 */
export function logSingleSplitGeometry(ref: SingleSplitVizRef): void {
  const { manager, canvasDimensions, displayMode } = ref;

  if (!manager || !canvasDimensions) {
    console.warn("[Geometry Logger] SingleSplitViz not ready - manager or dimensions missing");
    return;
  }

  // Get current state from manager
  const logicalState = manager.getLogicalState();
  const visibleState = manager.getCurrentVisibleState();
  const canvasData = manager.getCanvasData();
  const serverState = manager.getServerState();
  const splitIdx = manager.getSplitIndex();

  const drawableWidth = canvasData.pixelWidth - 2 * canvasData.margin.x;
  const drawableHeight = canvasData.pixelHeight - 2 * canvasData.margin.y;

  // Build logged segment group
  const segmentGroupBounds = logicalState.segmentDisplay.segmentGroupBounds;
  const segments: LoggedSegment[] = [];

  logicalState.segmentDisplay.responseGroups.forEach((rg, rgIdx) => {
    const points: LoggedPoint[] = [];
    const invalidPoints: LoggedPoint[] = [];

    // Get all points that belong to this segment from visible state
    for (const [key, pointDisplay] of visibleState) {
      const { point } = pointDisplay;

      // Check if this point belongs to this segment
      // For expanded mode: point.expandedResponseGroupIdx should match rgIdx
      // For collapsed mode: points may have various expandedResponseGroupIdx values
      // The server pre-assigns points to correct collapsed segments, so we just
      // iterate through the points in serverState for this segment

      // Find corresponding point in server state for this segment
      const serverRG = serverState.responseGroups[displayMode][rgIdx];
      const belongsToThisSegment = serverRG.pointPositions.some(
        pp => pp.point.splitIdx === point.splitIdx &&
          pp.point.expandedResponseGroupIdx === point.expandedResponseGroupIdx &&
          pp.point.id === point.id
      );

      if (!belongsToThisSegment) continue;

      const isInSegment = isPointInBounds(
        pointDisplay.position.x,
        pointDisplay.position.y,
        rg.bounds
      );

      const isInSegmentGroup = isPointInBounds(
        pointDisplay.position.x,
        pointDisplay.position.y,
        segmentGroupBounds
      );

      const loggedPoint: LoggedPoint = {
        key,
        basisSplitIdx: point.splitIdx,
        expandedRGIdx: point.expandedResponseGroupIdx,
        id: point.id,
        position: { ...pointDisplay.position },
        isInSegmentBounds: isInSegment,
        isInSegmentGroupBounds: isInSegmentGroup,
      };

      if (isInSegment) {
        points.push(loggedPoint);
      } else {
        invalidPoints.push(loggedPoint);
      }
    }

    segments.push({
      responseGroupIdx: rgIdx,
      label: rg.label,
      bounds: { ...rg.bounds },
      points,
      invalidPoints,
    });
  });

  const geometryLog: SingleSplitGeometryLog = {
    componentType: "SingleSplitViz",
    timestamp: new Date().toISOString(),
    canvas: {
      width: canvasData.pixelWidth,
      height: canvasData.pixelHeight,
      margin: { ...canvasData.margin },
      drawableArea: {
        width: drawableWidth,
        height: drawableHeight,
      },
    },
    displayMode,
    segmentGroup: {
      renderSplitIdx: splitIdx,
      basisSplitIndices: [...serverState.basisSplitIndices],
      bounds: { ...segmentGroupBounds },
      segments,
    },
  };

  // Download as JSON file
  const jsonString = JSON.stringify(geometryLog, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `single-split-geometry-${splitIdx}-${new Date().getTime()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  // Also log summary to console
  console.group("📊 SingleSplitViz Geometry Log");
  console.log(`✅ Downloaded geometry data as: ${a.download}`);
  console.log("\nSummary:");
  console.log(`- Split Index: ${splitIdx}`);
  console.log(`- Basis Splits: [${serverState.basisSplitIndices.join(", ")}]`);
  console.log(`- Display Mode: ${displayMode}`);
  console.log(`- Canvas: ${canvasData.pixelWidth}x${canvasData.pixelHeight}`);
  console.log(`- Segments: ${segments.length}`);

  const totalPoints = segments.reduce((sum, s) => sum + s.points.length, 0);
  const totalInvalid = segments.reduce((sum, s) => sum + s.invalidPoints.length, 0);
  console.log(`- Total Points: ${totalPoints}`);
  console.log(`- Invalid Points (outside segment): ${totalInvalid}`);

  if (totalInvalid > 0) {
    console.warn(`⚠️ Found ${totalInvalid} points outside their segment bounds!`);
    segments.forEach((seg, idx) => {
      if (seg.invalidPoints.length > 0) {
        console.warn(`  Segment ${idx} "${seg.label}": ${seg.invalidPoints.length} invalid`);
      }
    });
  }

  console.groupEnd();
}

/**
 * Log geometry for FullViz component
 * 
 * Captures all visible segment groups (splits) for current view with their segments and points.
 * Validates point positions against segment and segment group bounds.
 */
export function logFullVizGeometry(ref: FullVizRef): void {
  const { vizState, canvasDimensions, displayMode, canvasId, vizManager } = ref;

  if (!vizState?.segmentDisplay || !canvasDimensions || canvasId === null) {
    console.warn("[Geometry Logger] FullViz not ready - state, dimensions, or canvasId missing");
    return;
  }

  // Get current state from manager
  const logicalState = vizManager.getLogicalState(canvasId);
  const visibleState = vizManager.getCurrentVisibleState(canvasId);
  const canvasData = vizManager.getCanvasData(canvasId);
  const vizData = vizManager.getVisualizationData();

  if (!logicalState || !visibleState || !canvasData) {
    console.warn("[Geometry Logger] Failed to get state from VizStateManager");
    return;
  }

  const drawableWidth = canvasData.pixelWidth - 2 * canvasData.margin.x;
  const drawableHeight = canvasData.pixelHeight - 2 * canvasData.margin.y;

  // Get visible split indices for current view
  const viewId = logicalState.viewId;
  const visibleSplitIndices = vizData.viewMaps[viewId];

  if (!visibleSplitIndices) {
    console.warn(`[Geometry Logger] No splits found for viewId: ${viewId}`);
    return;
  }

  // Build logged segment groups
  const segmentGroups: LoggedSegmentGroup[] = [];

  // For FullViz, segmentDisplay contains ALL visible splits in nested array structure
  logicalState.segmentDisplay.forEach((splitDisplay, displayIdx) => {
    const splitIdx = visibleSplitIndices[displayIdx];
    const serverSplit = vizData.splits[splitIdx];

    const segments: LoggedSegment[] = [];
    const segmentGroupBounds = splitDisplay.segmentGroupBounds;

    splitDisplay.responseGroups.forEach((rg, rgIdx) => {
      const points: LoggedPoint[] = [];
      const invalidPoints: LoggedPoint[] = [];

      // Get points for this segment from server state
      const serverRG = serverSplit.responseGroups[displayMode][rgIdx];

      // Find corresponding points in visible state
      for (const pointPosition of serverRG.pointPositions) {
        const key = `${pointPosition.point.splitIdx}-${pointPosition.point.expandedResponseGroupIdx}-${pointPosition.point.id}`;
        const pointDisplay = visibleState.get(key);

        if (!pointDisplay) continue; // Point not in visible state (shouldn't happen)

        const isInSegment = isPointInBounds(
          pointDisplay.position.x,
          pointDisplay.position.y,
          rg.bounds
        );

        const isInSegmentGroup = isPointInBounds(
          pointDisplay.position.x,
          pointDisplay.position.y,
          segmentGroupBounds
        );

        const loggedPoint: LoggedPoint = {
          key,
          basisSplitIdx: pointPosition.point.splitIdx,
          expandedRGIdx: pointPosition.point.expandedResponseGroupIdx,
          id: pointPosition.point.id,
          position: { ...pointDisplay.position },
          isInSegmentBounds: isInSegment,
          isInSegmentGroupBounds: isInSegmentGroup,
        };

        if (isInSegment) {
          points.push(loggedPoint);
        } else {
          invalidPoints.push(loggedPoint);
        }
      }

      segments.push({
        responseGroupIdx: rgIdx,
        label: rg.label,
        bounds: { ...rg.bounds },
        points,
        invalidPoints,
      });
    });

    segmentGroups.push({
      renderSplitIdx: splitIdx,
      basisSplitIndices: [...serverSplit.basisSplitIndices],
      bounds: { ...segmentGroupBounds },
      segments,
    });
  });

  const geometryLog: FullVizGeometryLog = {
    componentType: "FullViz",
    timestamp: new Date().toISOString(),
    canvas: {
      width: canvasData.pixelWidth,
      height: canvasData.pixelHeight,
      margin: { ...canvasData.margin },
      drawableArea: {
        width: drawableWidth,
        height: drawableHeight,
      },
    },
    displayMode,
    viewId,
    segmentGroups,
  };

  // Download as JSON file
  const jsonString = JSON.stringify(geometryLog, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `full-viz-geometry-${viewId}-${new Date().getTime()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  // Also log summary to console
  console.group("📊 FullViz Geometry Log");
  console.log(`✅ Downloaded geometry data as: ${a.download}`);
  console.log("\nSummary:");
  console.log(`- View ID: ${viewId}`);
  console.log(`- Display Mode: ${displayMode}`);
  console.log(`- Canvas: ${canvasData.pixelWidth}x${canvasData.pixelHeight}`);
  console.log(`- Visible Segment Groups: ${segmentGroups.length}`);

  let totalPoints = 0;
  let totalInvalid = 0;
  segmentGroups.forEach((sg) => {
    sg.segments.forEach((seg) => {
      totalPoints += seg.points.length;
      totalInvalid += seg.invalidPoints.length;
    });
  });

  console.log(`- Total Points: ${totalPoints}`);
  console.log(`- Invalid Points (outside segment): ${totalInvalid}`);

  if (totalInvalid > 0) {
    console.warn(`⚠️ Found ${totalInvalid} points outside their segment bounds!`);
    segmentGroups.forEach((sg) => {
      sg.segments.forEach((seg, idx) => {
        if (seg.invalidPoints.length > 0) {
          console.warn(`  Split ${sg.renderSplitIdx}, Segment ${idx} "${seg.label}": ${seg.invalidPoints.length} invalid`);
        }
      });
    });
  }

  console.groupEnd();
}
