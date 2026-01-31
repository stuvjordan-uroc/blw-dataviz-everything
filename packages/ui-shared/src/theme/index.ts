import { colors } from './colors';
import { spacing, breakpoints as spacingBreakpoints } from './spacing';
import { typography } from './typography';

export { colors } from './colors';
export { spacing } from './spacing';
export { breakpoints as spacingBreakpoints } from './spacing';
export { typography } from './typography';
export { breakpoints, vizConfig, type Breakpoint } from './breakpoints';
export type { ColorPalette } from './colors';
export type { Spacing, Breakpoints } from './spacing';
export type { Typography } from './typography';

export const theme = {
  colors,
  spacing,
  breakpoints: spacingBreakpoints,
  typography,
} as const;

export type Theme = typeof theme;
