# polls-participant-utils

Utilities for participant-side interaction with polling sessions.

## Purpose

This package provides the client-side infrastructure for participants to interact with polling sessions. It bridges the gap between server-side session state (which is common to all participants) and participant-specific views and actions.

The package solves two key challenges:

1. **Streaming Updates**: Session visualizations change as new responses are processed by the API. Each participant's view needs to stay synchronized with these real-time updates via Server-Sent Events (SSE).

2. **Personal Views**: Each participant can choose their own personal view of the current (common) visualization state by selecting which questions to activate and whether to display collapsed or expanded response groups.

The core functionality integrates these two streams of change:

- **Common stream**: Server-side updates flowing via SSE
- **Personal choices**: Participant's view preferences (viewId, displayMode)

The result is a continuously-updated, participant-specific set of point positions ready for rendering.

## Package Structure

```
src/
  viz/                          # Visualization viewing utilities
    types.ts                    # Type definitions
    viewComputation.ts          # Pure functions for state transformation
    scaling.ts                  # Pure functions for coordinate scaling
    ParticipantVizState.ts      # State manager (integrates server + view state)
    SessionVizClient.ts         # High-level orchestrator (SSE + API + state)

  responses/                    # Response submission utilities (future)
    index.ts                    # Placeholder for response submission logic

  react/                        # React integration
    useSessionViz.ts            # Hook for visualization viewing
    useResponseForm.ts          # Hook for response submission (future)
```

## Core Components

### Visualization Viewing

**ParticipantVizState** - Manages the participant-specific visualization state

- Stores canonical server state (splits, basisSplitIndices)
- Stores participant's view preferences (viewId, displayMode)
- Computes visible points by combining both
- Tracks changes and generates diffs for animation

**SessionVizClient** - High-level orchestrator

- Connects to session via API
- Manages SSE connection for live updates
- Coordinates ParticipantVizState with external events
- Provides pub/sub interface for React (or other UI frameworks)

**useSessionViz** - React hook

- Declarative API for React components
- Handles connection lifecycle
- Triggers re-renders on state changes
- Provides action methods (switchView, setDisplayMode)

### Pure Computation

**viewComputation.ts** exports stateless, testable functions:

- `computeVisiblePoints()` - Filters splits and extracts points based on view
- `computeVisiblePointsDiff()` - Compares states for animation
- `filterSplitsByView()` - View-based split filtering
- `extractPointPositions()` - Point extraction from splits

**scaling.ts** exports functions for coordinate transformation:

- `scalePointsToCanvas()` - Transform abstract coordinates to pixel coordinates
- `getAbstractBounds()` - Compute bounding box of points
- `scaleCoordinate()` - Scale a single coordinate value
- `scaleLength()` - Scale distance/length values (for radii, widths, etc.)
- `calculateUniformScale()` - Calculate aspect-ratio-preserving scale factor

## Usage

### In a React Component

```tsx
import { useSessionViz } from "polls-participant-utils";

function VizViewerPage({ sessionSlug }: { sessionSlug: string }) {
  const { vizState, vizDiff, isLoading, error, switchView, setDisplayMode } =
    useSessionViz(sessionSlug, "http://localhost:3005");

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!vizState) return null;

  return (
    <>
      <VizCanvas points={vizState.points} diff={vizDiff} />
      <ViewControls onSwitchView={switchView} />
      <DisplayModeToggle onChange={setDisplayMode} />
    </>
  );
}
```

### Without React (Direct API)

```typescript
import { PollsApiClient } from "api-polls-client";
import { SessionVizClient } from "polls-participant-utils";

const apiClient = new PollsApiClient("http://localhost:3005");
const vizClient = new SessionVizClient(apiClient);

// Connect to session
const initialState = await vizClient.connect("my-session-slug");

// Subscribe to updates
vizClient.subscribe((state, diff) => {
  console.log("New visible points:", state.points);
  if (diff) {
    console.log("Added:", diff.added.length);
    console.log("Moved:", diff.moved.length);
    console.log("Removed:", diff.removed.length);
  }
});

// Participant interactions
vizClient.switchView("0,1,3"); // Activate questions 0, 1, 3
vizClient.setDisplayMode("expanded");

// Clean up
vizClient.disconnect();
```

## Future Additions

- Response submission utilities (`src/responses/`)
- `useResponseForm` React hook
- Form validation helpers
- Offline response queuing (if needed)

## Dependencies

- `api-polls-client` - API communication
- `shared-computation` - Core types and computation functions
- `shared-types` - Shared TypeScript types
- `react` - For React hooks (peer dependency)

## Related Packages

- `ui-polls-participant` - React UI that consumes this package
- `api-polls-public` - Server-side API for participants
- `api-polls-client` - Client library for API communication
