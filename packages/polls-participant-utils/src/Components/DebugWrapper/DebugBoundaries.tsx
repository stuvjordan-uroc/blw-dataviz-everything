import * as styles from "./DebugBoundaries.css";

interface SegmentDisplay {
  segmentGroupBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  responseGroups: Array<{
    bounds: { x: number; y: number; width: number; height: number };
    label: string;
  }>;
}

interface DebugBoundariesProps {
  segmentDisplay: SegmentDisplay | SegmentDisplay[];
  annotationMargin: { x: number; y: number };
  canvasDimensions: { width: number; height: number };
}

export function DebugBoundaries({
  segmentDisplay,
  annotationMargin,
  canvasDimensions,
}: DebugBoundariesProps) {
  // Normalize to array
  const segmentDisplays = Array.isArray(segmentDisplay)
    ? segmentDisplay
    : [segmentDisplay];

  return (
    <>
      {/* RED dotted — Annotation margin / full component bounds */}
      <div
        className={`${styles.overlay} ${styles.annotationMarginBorder}`}
        style={{
          left: 0,
          top: 0,
          width: canvasDimensions.width + 2 * annotationMargin.x,
          height: canvasDimensions.height + 2 * annotationMargin.y,
        }}
      />

      {/* BLUE dashed — Canvas drawable area (inside annotation margin) */}
      <div
        className={`${styles.overlay} ${styles.canvasDrawableAreaBorder}`}
        style={{
          left: annotationMargin.x,
          top: annotationMargin.y,
          width: canvasDimensions.width,
          height: canvasDimensions.height,
        }}
      />

      {/* Render boundaries for each segment group */}
      {segmentDisplays.map((display, groupIdx) => (
        <div key={groupIdx}>
          {/* GREEN dashed — Segment group boundary */}
          <div
            className={`${styles.overlay} ${styles.segmentGroupBorder}`}
            style={{
              left: display.segmentGroupBounds.x + annotationMargin.x,
              top: display.segmentGroupBounds.y + annotationMargin.y,
              width: display.segmentGroupBounds.width,
              height: display.segmentGroupBounds.height,
            }}
          />

          {/* YELLOW solid — Individual segment boundaries */}
          {display.responseGroups.map((rg, idx) => (
            <div
              key={idx}
              className={`${styles.overlay} ${styles.segmentBorder}`}
              style={{
                left: rg.bounds.x + annotationMargin.x,
                top: rg.bounds.y + annotationMargin.y,
                width: rg.bounds.width,
                height: rg.bounds.height,
              }}
              title={rg.label}
            />
          ))}
        </div>
      ))}

      {/* Legend */}
      <div className={styles.legendContainer}>
        <div className={styles.legendItem}>
          <div
            className={`${styles.legendSwatch} ${styles.annotationMarginBorder}`}
          />
          <span>Annotation margin</span>
        </div>
        <div className={styles.legendItem}>
          <div
            className={`${styles.legendSwatch} ${styles.canvasDrawableAreaBorder}`}
          />
          <span>Canvas drawable area</span>
        </div>
        <div className={styles.legendItem}>
          <div
            className={`${styles.legendSwatch} ${styles.segmentGroupBorder}`}
          />
          <span>Segment group</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendSwatch} ${styles.segmentBorder}`} />
          <span>Segment</span>
        </div>
      </div>
    </>
  );
}
