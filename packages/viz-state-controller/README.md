# Visualization State Controller

Pure state transformer for visualization data. Merges server-side state (complete visualization data) with client-side view preferences (which questions are active, display mode) to produce renderable output.

## Architecture

This package is part of a larger client-side visualization system:

- **api-polls-client**: Communication layer (fetch, EventSource)
- **viz-state-controller**: State logic (this package)
- **viz-renderer-canvas**: Rendering layer (animation, canvas drawing)
- **app-public/admin**: UI applications

## Responsibilities

**What it does:**
- Stores full server state (all splits with point positions)
- Stores client view preferences (active grouping questions, display mode)
- Filters splits to match current view
- Extracts visible points with final positions
- Generates diffs between states for animation

**What it does NOT do:**
- Animation/tween computation (handled by renderer)
- Frame timing (requestAnimationFrame)
- Visual effects or rendering
- DOM or Canvas manipulation

## Design Principles

### Pure State Transformation

All methods are pure functions that take state and return new state. No side effects, no rendering, no timers.

### End States, Not Tweens

State changes (server updates or client view changes) produce:
1. **End state**: Where all points should be after transition
2. **Diff**: What changed (added/removed/moved points with deltas)

The renderer uses this to compute and animate tweens.

### Full Snapshots

The server always sends complete snapshots (not just diffs). The state controller:
- Stores the full snapshot
- Re-filters on client state changes
- Always derives from authoritative server data

This is simpler and more correct than maintaining incremental updates.

## Usage

```typescript
import { VizStateController } from 'viz-state-controller';
import type { SplitWithSegmentGroup } from 'shared-computation';

// Initialize with server data
const controller = new VizStateController(
  initialSplits,
  basisSplitIndices,
  {
    activeGroupingQuestions: new Set(['0', '1']),  // Question indices
    displayMode: 'collapsed'
  }
);

// Server update (new responses received)
const { endState, diff } = controller.applyServerUpdate(newSplits);
// Pass endState and diff to renderer for animation

// User changes active questions (view change)
const result = controller.setActiveQuestions(new Set(['1', '2']));
// Renderer animates points from old positions to new positions

// User toggles display mode
const result2 = controller.setDisplayMode('expanded');
// Renderer animates collapse/expand transition

// Get current visible points without changing state
const current = controller.getVisiblePoints();
```

## Output Format

### VisiblePointsState
```typescript
{
  points: PointPosition[]  // Flat array of all visible points with x,y positions
}
```

### VisiblePointsDiff
```typescript
{
  added: PointPosition[],      // Points that appeared
  removed: PointPosition[],    // Points that disappeared
  moved: Array<{               // Points that moved
    point: Point,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    dx: number,              // Delta for interpolation
    dy: number
  }>
}
```

## View Filtering

A split matches the current view when its `groups` array has non-null `responseGroup` values for exactly the active grouping questions.

Currently uses string-based question ID matching (prototype). Will be refined when integrated with real session configuration.

## Performance

Start simple, profile with real data:
1. Prototype with explicit filtering logic (current implementation)
2. Profile with 1K, 10K splits
3. Optimize based on profiling results if needed

Server-side optimizations (lookup maps, indexed structures) can be added if filtering becomes a bottleneck.

## Status

**Current**: Fully implemented with proper types, view filtering, and diff generation.

**Next**:
- Integration testing with api-polls-client
- Performance profiling with real session data
- Refinement of view matching logic with actual session config
- Create viz-renderer-canvas package for animation

## Development

```bash
# Build
npm run build

# Watch mode
npm run watch
```

## Dependencies

- `shared-computation`: Types and structures (SplitWithSegmentGroup, Point, PointPosition)
