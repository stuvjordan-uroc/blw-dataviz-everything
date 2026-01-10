# VizCanvas Component

A minimal React component that manages canvas lifecycle and VizStateManager attachment for full visualizations.

## Purpose

VizCanvas is Layer 1 in the visualization component architecture. It focuses solely on:

1. Rendering a `<canvas>` element
2. Attaching the canvas to a VizStateManager via `attachCanvas()` on mount
3. Detaching the canvas on unmount
4. Updating canvas width when the `width` prop changes

## What it Does NOT Handle

- **Width responsiveness**: Parent component controls the `width` prop
- **Segment boundaries/labels**: Use `VizCanvasWithAnnotations` (Layer 2a, to be implemented)
- **User controls**: Use `ControllableViz` (Layer 2b, to be implemented)

## Usage

```tsx
import { useSessionViz, VizCanvas } from "polls-participant-utils";

function MyVizPage() {
  const { vizRefs, vizStatuses } = useSessionViz(apiUrl, sessionSlug);
  const [width, setWidth] = useState(800);

  const vizManager = vizRefs.get("my-viz-id")?.vizManager;
  const vizStatus = vizStatuses.get("my-viz-id");

  if (vizStatus !== "ready" || !vizManager) {
    return <div>Loading...</div>;
  }

  const config = {
    initialCanvasWidth: width,
    initialDisplayMode: "expanded" as const,
    initialViewId: "",
    animation: {
      appearDuration: 200,
      moveDuration: 400,
    },
    margin: { x: 20, y: 20 },
  };

  return (
    <div>
      <input
        type="range"
        min="400"
        max="1200"
        value={width}
        onChange={(e) => setWidth(Number(e.target.value))}
      />
      <VizCanvas
        vizManager={vizManager}
        width={width}
        initialConfig={config}
        onAttached={({ canvasId, detach }) => {
          console.log("Canvas attached with ID:", canvasId);
        }}
      />
    </div>
  );
}
```

## Props

### `vizManager: VizStateManager` (required)

The VizStateManager instance to attach the canvas to. Should be a stable reference (e.g., from `useSessionViz`'s `vizRefs`).

### `width: number` (required)

Canvas width in pixels. The parent component controls this value. When it changes, `vizManager.setCanvasWidth()` is called automatically.

### `initialConfig: VizRenderConfig` (required)

Initial configuration for the canvas, used when `attachCanvas()` is called.

**Important**: This should be a stable reference. Changes to this object will trigger canvas re-attachment, which is expensive. Use `useMemo` if you're computing this value:

```tsx
const config = useMemo(
  () => ({
    initialCanvasWidth: width,
    initialDisplayMode: "expanded",
    initialViewId: "",
    animation: { appearDuration: 200 },
    margin: { x: 20, y: 20 },
  }),
  [width]
); // Only recreate if width changes
```

### `onAttached?: (result: { canvasId: number; detach: () => void }) => void` (optional)

Callback invoked after the canvas is successfully attached. Receives:

- `canvasId`: The ID to use when calling VizStateManager methods
- `detach`: Function to manually detach the canvas (cleanup is automatic on unmount)

Useful for parent components that need to call VizStateManager methods directly (e.g., `vizManager.setClientViewId(canvasId, newViewId)`).

## Architecture Notes

VizCanvas is designed to be composed with higher-level components:

```
VizCanvas (Layer 1)
  ↓
VizCanvasWithAnnotations (Layer 2a) - adds boundaries/labels
  ↓
ControllableViz (Layer 2b) - adds user controls
  ↓
SessionVizDisplay (Layer 3) - manages multiple visualizations
```

This separation enables:

- Testing canvas rendering in isolation
- Reusing VizCanvas in read-only contexts (no annotations)
- Customizing annotation rendering strategies
- Maximum flexibility for different use cases

## Implementation Details

### Canvas Attachment Lifecycle

1. **On mount**: Canvas ref is attached to VizStateManager
2. **On width change**: `setCanvasWidth()` is called
3. **On unmount**: Canvas is detached automatically

### Error Handling

The component includes defensive checks and console warnings for:

- Null canvas refs
- Invalid width values (non-finite or ≤ 0)
- Attachment failures
- Detachment errors

### Callback Stability

The `onAttached` callback is stored in a ref to prevent re-attachment when the callback reference changes. Only changes to `vizManager` or `initialConfig` trigger re-attachment.
