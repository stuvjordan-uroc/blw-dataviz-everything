// Apply global styles (fonts + CSS reset)
import './styles/fonts.css';
import './styles/reset.css';

// Export theme
export { theme, colors, spacing, spacingBreakpoints as breakpoints, typography, vizConfig } from './theme';
export type { Theme, ColorPalette, Spacing, Breakpoints, Typography, Breakpoint } from './theme';

// Export hooks
export { useBreakpoint } from './hooks';

// Export components
export { Header } from './components/Header';

export { PageLayout } from './components/PageLayout';
export type { PageLayoutProps } from './components/PageLayout';
