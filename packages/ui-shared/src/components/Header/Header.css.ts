import { style } from '@vanilla-extract/css';
import { colors, spacing } from '../../theme';

export const header = style({
  display: 'flex',
  alignItems: 'center',
  padding: `${spacing.md} ${spacing.lg}`,
  background: `linear-gradient(0deg, ${colors.site.gray[100]}, ${colors.site.goldenrod[500]} 10%, ${colors.site.gray[100]} 20%, ${colors.site.whale[800]} 50%)`,
  color: colors.site.frame.text,
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  minHeight: '64px',
});

export const branding = style({
  fontSize: '1.5rem',
  fontWeight: 700,
  letterSpacing: '-0.025em',
});
