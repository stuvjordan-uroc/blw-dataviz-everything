/**
 * Responsive breakpoints for window width (in pixels)
 */
export const breakpoints = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Visualization rendering configuration for each breakpoint
 * Ties together canvas width and annotation margins to ensure consistency
 */
export const vizConfig = {
  mobile: {
    canvasWidth: 280,
    annotationMargin: { x: 20, y: 20 },
  },
  tablet: {
    canvasWidth: 720,
    annotationMargin: { x: 30, y: 30 },
  },
  desktop: {
    canvasWidth: 800,
    annotationMargin: { x: 40, y: 40 },
  },
  wide: {
    canvasWidth: 1000,
    annotationMargin: { x: 50, y: 50 },
  },
} as const satisfies Record<Breakpoint, { canvasWidth: number; annotationMargin: { x: number; y: number } }>;
