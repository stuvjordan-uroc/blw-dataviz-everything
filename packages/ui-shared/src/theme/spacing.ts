/**
 * Spacing scale (using rem units for accessibility)
 */
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '6rem',   // 96px
} as const;

/**
 * Breakpoints for responsive design (mobile-first)
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;

export type Spacing = typeof spacing;
export type Breakpoints = typeof breakpoints;
