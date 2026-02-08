# Visualization Config Guide

How to choose `SegmentVizConfig` values for a polling session, given the expected number of participants.

## Overview

Each visualization in a session is defined by a `SegmentVizConfig` (see `packages/shared-types/src/visualization.ts`). The layout parameters in this config control both the abstract coordinate space (used by the backend to position points) and — indirectly — how dense or sparse the visualization looks on screen.

The key tension: **the same config drives both FullViz and SingleSplitViz**, but SingleSplitViz zooms into a single segment group, so it renders at a much larger scale. A config that looks right in FullViz may feel sparse in SingleSplitViz, and vice versa. This guide focuses on making reasonable choices given that constraint, and flags areas where the system may evolve.

## Config Parameters at a Glance

```typescript
type SegmentVizConfig = {
  responseQuestion: ResponseQuestion;
  groupingQuestions: { x: GroupingQuestion[]; y: GroupingQuestion[] };

  // Layout (abstract coordinate units)
  minGroupAvailableWidth: number; // Extra width distributed by proportion within each segment group
  minGroupHeight: number; // Height of each segment group
  groupGapX: number; // Horizontal gap between segment groups
  groupGapY: number; // Vertical gap between segment groups
  responseGap: number; // Gap between segments within a group
  baseSegmentWidth: number; // Fixed base width of every segment

  // Point rendering
  images: {
    circleRadius: number; // Radius of each point circle (pixels)
    baseColorRange: [string, string];
    groupColorOverrides: GroupColorOverride[];
  };
};
```

### Which Parameters Affect Density?

| Parameter                     | Role                                                                                                                                        | Impact on visual density                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **`minGroupHeight`**          | Sets the height of each segment group in abstract units. Controls the canvas aspect ratio and therefore the vertical pixel space available. | **Strongest lever.** Lower = shorter canvas = points packed tighter vertically.         |
| **`minGroupAvailableWidth`**  | Extra width (beyond base widths + gaps) distributed proportionally across segments.                                                         | Moderate. Higher values widen segments, giving points more horizontal room.             |
| **`circleRadius`**            | Pixel radius of each dot.                                                                                                                   | **Direct.** Bigger dots fill more of each cell. Doubling radius quadruples visual area. |
| **`baseSegmentWidth`**        | Fixed width added to every segment regardless of proportion.                                                                                | Minor. Ensures segments with 0% proportion are still visible.                           |
| **`responseGap`**             | Horizontal space between adjacent segments.                                                                                                 | Minor. Adds to total width but doesn't affect point placement.                          |
| **`groupGapX` / `groupGapY`** | Space between segment groups.                                                                                                               | FullViz only (SingleSplitViz renders one group). Affects FullViz scale.                 |

## How the Geometry Pipeline Works

### Abstract Space

`getWidthHeight()` computes the total abstract dimensions:

```
vizWidth  = (maxGroupsX - 1) × groupGapX
          + maxGroupsX × (
              (numSegments - 1) × responseGap
              + numSegments × baseSegmentWidth
              + minGroupAvailableWidth
            )

vizHeight = (maxGroupsY - 1) × groupGapY
          + maxGroupsY × minGroupHeight
```

Where `maxGroupsX` and `maxGroupsY` are the products of response group counts across x/y grouping questions (1 if no grouping questions on that axis).

### Canvas Mapping

**FullViz**: The entire abstract space (vizWidth × vizHeight) maps to the canvas. Scale factor = `canvasWidth / vizWidth`.

**SingleSplitViz**: Only one segment group maps to the canvas. Scale factor = `canvasWidth / segmentGroupWidth`. Since `segmentGroupWidth < vizWidth`, SingleSplitViz has a **much larger scale factor** — points appear bigger relative to segments.

### Point Positioning

Points are placed via jittered grid: the segment area is divided into a grid of `cols × rows` cells (one per point), with each point randomly placed within its cell. The on-screen cell size is:

```
cellHeight_px ≈ (drawableCanvasHeight) / rows
cellWidth_px  ≈ (segmentCanvasWidth) / cols
```

The **fill ratio** — `circleRadius × 2 / min(cellWidth, cellHeight)` — determines how "full" or "sparse" the visualization looks. A fill ratio of **0.25–0.5** reads as comfortably populated.

## Recommendations by Participant Count

The tables below assume:

- **No grouping questions** (single segment group, so FullViz ≈ SingleSplitViz)
- **Desktop breakpoint** (`canvasWidth = 800px`, `margin = {x: 20, y: 20}`)
- **3 expanded response groups** (a common setup)
- Roughly uniform response distribution

### Quick-Reference Configs

| Expected Participants | `minGroupHeight` | `minGroupAvailableWidth` | `baseSegmentWidth` | `responseGap` | `circleRadius` | Notes                                                        |
| --------------------- | ---------------- | ------------------------ | ------------------ | ------------- | -------------- | ------------------------------------------------------------ |
| **10**                | 30               | 80                       | 10                 | 5             | 10             | Very compact. Points fill most of the segment area.          |
| **20**                | 45               | 100                      | 10                 | 5             | 8              | Moderate density. Segments are slightly taller.              |
| **50**                | 80               | 120                      | 10                 | 5             | 8              | Balanced. Grid becomes multi-column in wider segments.       |
| **100**               | 130              | 150                      | 10                 | 5             | 7              | Taller segments. Points visually distinguishable but packed. |
| **200**               | 200              | 200                      | 10                 | 5             | 6              | Large canvas. Consider smaller radius to avoid overlap.      |

Gap parameters (`groupGapX`, `groupGapY`) should generally stay at **10–20** regardless of participant count — they primarily affect FullViz spacing.

### Worked Example: 20 Participants, 3 Expanded Groups

```typescript
{
  // ... responseQuestion, groupingQuestions ...
  minGroupAvailableWidth: 100,
  minGroupHeight: 45,
  groupGapX: 10,
  groupGapY: 10,
  responseGap: 5,
  baseSegmentWidth: 10,
  images: {
    circleRadius: 8,
    baseColorRange: ['#a5d6a7', '#1b5e20'],
    groupColorOverrides: [],
  },
}
```

**What happens**: With ~7 points per segment (20/3), each segment gets a 1-column × 7-row grid. Abstract segment width ≈ 35 units, group width = 115 units. Canvas: 800 × 313px. Drawable: 760 × 273px. Cell height ≈ 39px per point. Circle diameter = 16px → fill ratio ≈ 0.41. Looks well-populated.

### Worked Example: 100 Participants, 4 Expanded Groups

```typescript
{
  // ... responseQuestion, groupingQuestions ...
  minGroupAvailableWidth: 150,
  minGroupHeight: 130,
  groupGapX: 10,
  groupGapY: 10,
  responseGap: 5,
  baseSegmentWidth: 10,
  images: {
    circleRadius: 7,
    baseColorRange: ['#a5d6a7', '#1b5e20'],
    groupColorOverrides: [],
  },
}
```

**What happens**: With ~25 points per segment (100/4), jittered grid creates a 3×9 or 4×7 layout depending on segment proportions. Abstract vizWidth = 225 units. Canvas: 800 × 462px. Circle diameter = 14px. Fill ratio ≈ 0.30. Points are individually visible but segments feel populated.

## Effect on FullViz vs SingleSplitViz

### The Scale Divergence Problem

When there are **no grouping questions**, FullViz and SingleSplitViz render identically — one segment group fills the whole canvas.

When grouping questions are active:

- **FullViz** renders the entire grid of segment groups. With 2 x-axis groups × 2 y-axis groups, the scale factor is roughly **4× smaller** than SingleSplitViz.
- **SingleSplitViz** renders just one segment group at full canvas width.

This means:

- Points in FullViz appear much smaller (the circle radius is in pixels, but the segment area is much smaller on screen)
- A config tuned for SingleSplitViz density will look extremely sparse in FullViz
- A config tuned for FullViz density may overflow in SingleSplitViz

### Practical Guidance

For sessions **without grouping questions**: No conflict — tune freely using the tables above.

For sessions **with grouping questions**: Optimize for SingleSplitViz (the primary participant view) and accept that FullViz will look sparser. If FullViz density matters, increase `circleRadius` by a factor of roughly `sqrt(numGroupsX × numGroupsY)`.

> **Future consideration**: SingleSplitViz could auto-adjust its rendering — for example, by applying a local scale factor to circleRadius or by recomputing point positions for the zoomed-in view. This would decouple SingleSplitViz density from FullViz density. See the roadmap notes below.

## The Math (For Reference)

If you want to compute exact values rather than using the table:

The fill ratio for a SingleSplitViz segment with `n` points, segment abstract width `w`, and group abstract height `h` is approximately:

```
aspect = w / h
cols   = round(sqrt(n × aspect))
rows   = ceil(n / cols)

segmentCanvasWidth  = drawableCanvasWidth × w / segmentGroupWidth
segmentCanvasHeight = drawableCanvasHeight

cellHeight = segmentCanvasHeight / rows
fillRatio  = (2 × circleRadius) / cellHeight
```

Target `fillRatio` between **0.25** (airy, points clearly separated) and **0.5** (dense, lively).

Solving for `minGroupHeight` to hit a target fill ratio `F`:

```
minGroupHeight ≈ (vizWidth × (N/k) × 2 × circleRadius) / (canvasWidth × F)
```

Where:

- `vizWidth` = total abstract width (depends on `minGroupAvailableWidth`, `baseSegmentWidth`, `responseGap`, and number of segments `k`)
- `N` = expected participant count
- `k` = number of expanded response groups
- `canvasWidth` = pixel width from breakpoint config (typically 800 for desktop)
- `F` = target fill ratio (0.3–0.4 recommended)

## Roadmap / Known Limitations

1. **Single config for both view types**: Currently, `SegmentVizConfig` is shared by SingleSplitViz and FullViz. A future improvement could have SingleSplitViz auto-scale, or allow per-view-type overrides.

2. **Circle radius is in pixels, not abstract units**: This means dots don't scale with canvas width (they stay the same pixel size at all breakpoints). For mobile breakpoints (280px canvas), dots may appear disproportionately large. A future option could express radius relative to segment area.

3. **Dynamic participant count**: Sessions may start with few participants and grow. Currently, the jittered grid re-layouts all points on each update, so density adjusts naturally. But the config is static — the canvas size doesn't adapt. A future autoscaling mode could adjust `minGroupHeight` based on current response count.
