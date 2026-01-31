import { style } from '@vanilla-extract/css';
import { colors } from '../../theme';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  background: `linear-gradient(0deg, ${colors.site.goldenrod[500]}, ${colors.site.gray[100]} 2%, hsl(192, 7%, 50%) 3%, ${colors.site.whale[800]} 15%)`,
});

export const contentWrapper = style({
  flex: 1,
  display: 'flex',
  justifyContent: 'center',
  overflow: 'auto',
});

export const content = style({
  width: '100%',
  maxWidth: '1200px',
  padding: '2rem 1rem',
  backgroundColor: colors.site.content.background,
  color: colors.site.content.text,

  '@media': {
    '(min-width: 768px)': {
      padding: '2rem 2rem',
    },
  },
});
