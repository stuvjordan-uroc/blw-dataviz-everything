## Segment Viz

```typescript
export interface VizConfigSegments {
  groupingQuestionsHorizontal: Question[];
  groupingQuestionsVertical: Question[];
  syntheticSampleSize?: number;
  responseGap: number;
  minGroupAvailableWidth: number;
  groupGapHorizontal: number;
  groupGapVertical: number;
  minGroupHeight: number;
}
```

### Layout Configuration

Layout configuration is specified in abstract units. We normalize 1 of these units as the radius of a point in the visualization. Then all configuration lengths are interpreted as as multiples of the radius of points in the visualization.

We break the presentation of the configuration for the length parameters in the two groups: Horizontal Lengths and Vertical Lengths.

#### Horizontal Lengths

- responseGap. This is the width of the gap along the horizontal axis between segments within any given segment group in all views, specified in point radii. For instance, if you set responseGap = 4, the gaps between segments within each segment group in every view will be 4x the pointRadius.

- groupGapHorizontal. This is the width of the gap between segment groups along the horizontal axis in all views, specified in point radii. For instance, if you set groupGapHorizontal = 8, the gaps between segment groups along the horizontal axis in all views will be 8x the pointRadius.

- minGroupAvailableWidth. This is the width of a segment group _when all horizontal groups are active_ _and when the response question response groups are expanded_ in point radius units, net of the total width taken up by response gaps. For instance, if response gap is 10, there are 4 response groups on the response question in the expanded view, and minGroupAvailableWidth = 100, then total width of a segment group in the view with all horizontal groups active will be 3 X 10 + 100 = 130.

These three lengths fully determine the horizontal layout of the viz. Specifically, we take these three lengths and compute the total vizWidth as follows: First note that the three lengths determine the width of the segment groups in the view in which all horizontal groups are active. Second note that groupGapHorizontal determines the width between these groups. Then we fix the vizWidth as:

(# horizontal segment groups in view in which all horizontal groups are active) X (Width of segment groups in view in which all horizontal groups are active) + (Width of group gaps) X (# horizontal segment groups in view in which all horizontal groups are active - 1)

This vizWidth of course is specified in point radii.

This horizontal vizWidth is the same for ALL VIEWS. We simply keep the width of the responseGaps and the width of the groupGapHorizontal constant. As the number of active horizontal groups change, we simply expand the widths of the segment groups to take up the leftover space within the fixed vizWidth accordingly, with the left-most segment group starting at x = 0, and the right-most segment group ending at x = vizWidth.

#### Vertical Lengths

- groupGapVertical. This is the width of the gap between segment groups along the vertical axis in all views, specified in point radii. For instance, if you set groupGapVertical = 20, the gaps between segment groups along the vertical axis in all views will be 20x the pointRadius

- minGroupHeight. This is the total height of a segment group _in the view in which all vertical groups are active_, specified in point radii.

These two lengths fully determine the vertical layout of the viz. Specifically, we take these two lengths and compute the total vizHeight as follows:

(# segment groups along vertical axis when all vertical grouping questions active) X minGroupHeight + (# segment groups along vertical axis when all vertical grouping questions active - 1) X groupGapVertical

This vertical vizHeight is the same for ALL VIEWS. We simply keep the height of the groupGapVertical constant. As the number of active vertical groups change, we increase the heights of the segment groups to take up the leftover space within the fixed vizWidth accordingly, with the top segment group always starting at y=0 and the bottom segment group ending at y = vizHeight.
