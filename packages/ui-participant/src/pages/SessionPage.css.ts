import { style } from '@vanilla-extract/css';
import { colors, spacing } from 'ui-shared';

export const centerContent = style({
  textAlign: 'center',
  padding: spacing.xl,
});

export const heading = style({
  fontSize: spacing.xl,
  fontWeight: 700,
  marginBottom: spacing.md,
});

export const errorHeading = style({
  color: colors.site.status.error,
  marginBottom: spacing.md,
});

export const warningBox = style({
  padding: spacing.lg,
  backgroundColor: colors.site.goldenrod[100],
  border: `1px solid ${colors.site.status.warning}`,
  borderRadius: '4px',
  marginBottom: spacing.md,
});

export const successBox = style({
  padding: spacing.xl,
  backgroundColor: colors.site.gray[100],
  border: `1px solid ${colors.site.status.success}`,
  borderRadius: '4px',
  textAlign: 'center',
});

export const successHeading = style({
  color: colors.site.status.success,
  marginBottom: spacing.md,
});

export const instruction = style({
  marginBottom: spacing.lg,
});

export const noMargin = style({
  margin: 0,
});

export const visualizationsContainer = style({
  marginTop: spacing['2xl'],
});

export const visualizationsHeading = style({
  fontSize: '1.5rem',
  fontWeight: 700,
  marginBottom: spacing.xl,
  textAlign: 'center',
});

export const connectionStatus = style({
  textAlign: 'center',
  padding: spacing.lg,
  marginBottom: spacing.xl,
  backgroundColor: colors.site.gray[100],
  borderRadius: '4px',
});

export const vizSection = style({
  marginBottom: spacing['3xl'],
  padding: spacing.xl,
  backgroundColor: colors.site.gray[0],
  borderRadius: '8px',
  border: `1px solid ${colors.site.content.border}`,
});

export const vizQuestionHeading = style({
  fontSize: '1.25rem',
  fontWeight: 600,
  marginBottom: spacing.lg,
  color: colors.site.content.text,
});

export const vizLoading = style({
  textAlign: 'center',
  padding: spacing.xl,
  color: colors.site.content.textMuted,
});

export const vizError = style({
  textAlign: 'center',
  padding: spacing.xl,
  color: colors.site.status.error,
  backgroundColor: colors.site.gray[100],
  borderRadius: '4px',
});

export const vizWrapper = style({
  display: 'flex',
  justifyContent: 'center',
  marginTop: spacing.lg,
});
