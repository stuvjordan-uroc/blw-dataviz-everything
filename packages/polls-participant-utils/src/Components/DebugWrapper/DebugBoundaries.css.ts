import { style } from '@vanilla-extract/css';

export const overlay = style({
  position: 'absolute',
  pointerEvents: 'none',
  zIndex: 10,
});

/** Red dotted — outer annotation margin (full component bounds) */
export const annotationMarginBorder = style({
  border: '2px dotted rgba(255, 0, 0, 0.7)',
});

/** Blue dashed — canvas drawable area (inside margin) */
export const canvasDrawableAreaBorder = style({
  border: '2px dashed rgba(0, 100, 255, 0.7)',
});

/** Green dashed — segment group bounds */
export const segmentGroupBorder = style({
  border: '2px dashed rgba(0, 180, 0, 0.7)',
});

/** Yellow solid — individual segment bounds */
export const segmentBorder = style({
  border: '1px solid rgba(220, 180, 0, 0.8)',
});

/** Legend label */
export const legendContainer = style({
  position: 'absolute',
  bottom: 4,
  left: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  fontSize: '10px',
  fontFamily: 'monospace',
  zIndex: 11,
  pointerEvents: 'none',
  backgroundColor: 'rgba(0,0,0,0.6)',
  padding: '4px 6px',
  borderRadius: '3px',
  color: 'white',
});

export const legendItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});

export const legendSwatch = style({
  width: 12,
  height: 8,
  flexShrink: 0,
});
