## Segment Viz

```typescript
export interface VizConfigSegments {
  groupingQuestionsHorizontal: Question[];
  groupingQuestionsVertical: Question[];
  syntheticSampleSize?: number;
  responseGap: number;
  groupGapHorizontal: number;
  groupGapVertical: number;
  segmentGroupWidth: number;
}
```

### Layout Configuration

Layout configuration is specified in abstract units. We normalize 1 of these units as the radius of a point in the visualization. Then all configuration lengths are interpreted as as multiples of the radius of points in the visualization.

We break the presentation of the configuration for the length parameters in the two groups: Horizontal Lengths and Vertical Lengths.

#### Horizontal Lengths

- responseGap. This is the width of the gap along the horizontal axis between segments within any given segment group in all views, specified in point radii. For instance, if you set responseGap = 4, the gaps between segments within each segment group in every view will be 4x the pointRadius.

- groupGapHorizontal. This is the width of the gap between segment groups along the horizontal axis in all views, specified in point radii. For instance, if you set groupGapHorizontal = 8, the gaps between segment groups along the horizontal axis in all views will be 8x the pointRadius.

- segmentGroupWidth. This one is complicated. Hang on to your butts. This is the total width of a segment group _in the view in which all horizontal groups are active_, specified as a multiple of the total width of the response gaps _in the view in which the response groups of the response question are expanded_. For instance, suppose that there are 4 expanded response groups of the response question so that in any expanded view, each segment group contains 3 response gaps. Now suppose you set responseGap = 4. Then the total space taken up by response gaps within any segment group in any expanded view will be 3 X 4 point radius units. Now suppose you set segmentGroupWidth = 10. Then, the width of a segment group in the view in which all horizontal groups are active will be 10 X 3 X 4 point radius units.

These three lengths fully determine the horizontal layout of the viz. Specifically, we take these three lengths and compute the total vizWidth as follows: First note that the three lengths determine the width of the segment groups in the view in which all horizontal groups are active and the response groups of the response question is expanded. Second note that groupGapHorizontal determines the width between these gaps. Then we fix the vizWidth as:

(# horizontal segment groups in view in which all horizontal groups are active) X (Width of segment groups in view in which all horizontal groups are active and response groups of response question are expanded) + (Width of group gaps) X (# horizontal segment groups in view in which all horizontal groups are active - 1)

This vizWidth of course is specified in point radii.

This horizontal vizWidth is the same for ALL VIEWS. We simply keep the width of the responseGaps and the width of the groupGapHorizontal constant. As the number of response groups on the response question and/or active horizontal groups change, we simply expand the widths of the segment groups to take up the leftover space within the fixed vizWidth accordingly, with the left-most segment group starting at x = 0, and the right-most segment group ending at x = vizWidth.

#### Vertical Lengths

- groupGapVertical. This is the width of the gap between segment groups along the vertical axis in all views, specified in point radii. For instance, if you set groupGapVertical = 20, the gaps between segment groups along the vertical axis in all views will be 20x the pointRadius

- segmentGroupHeight. This is the total height of a segment group _in the view in which all vertical groups are active_, specified in point radii.

These two lengths fully determine the vertical layout of the viz. Specifically, we take these two lengths and compute the total vizHeight as follows:

(# vertical grouping questions) X segmentGroupHeight + (# vertical grouping questions - 1) X groupGapVertical

This vertical vizHeight is the same for ALL VIEWS. We simply keep the height of the groupGapVertical constant. As the number of active vertical groups change, we simply expand the heights of the segment groups to take up the leftover space within the fixed vizWidth accordingly, with the top segment group always starting at y=0 and the bottom segment group ending at y = vizHeight.
