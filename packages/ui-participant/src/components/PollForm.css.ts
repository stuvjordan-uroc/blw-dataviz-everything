import { style } from '@vanilla-extract/css';
import { colors, spacing } from 'ui-shared';

export const form = style({
  maxWidth: '800px',
  margin: '0 auto',
});

export const questionList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.xl,
});

export const questionCard = style({
  padding: spacing.lg,
  backgroundColor: colors.site.gray[100],
  borderRadius: '8px',
});

export const questionLabel = style({
  display: 'block',
  marginBottom: spacing.md,
});

export const questionText = style({
  fontWeight: 'bold',
  marginBottom: spacing.sm,
});

export const responseList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
});

export const responseOption = style({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
  cursor: 'pointer',
});

export const radioInput = style({
  cursor: 'pointer',
});

export const textInput = style({
  width: '100%',
  padding: spacing.sm,
  fontSize: spacing.md,
  borderRadius: '4px',
  border: `1px solid ${colors.site.content.border}`,
});

export const errorBox = style({
  color: colors.site.status.error,
  margin: `${spacing.md} 0`,
  padding: spacing.md,
  backgroundColor: colors.site.gray[100],
  borderRadius: '4px',
  border: `1px solid ${colors.site.status.error}`,
});

export const submitButton = style({
  marginTop: spacing.xl,
  padding: `${spacing.md} ${spacing.xl}`,
  fontSize: '1.125rem',
  fontWeight: 'bold',
  color: colors.site.interactive.primaryText,
  border: 'none',
  borderRadius: '4px',
  width: '100%',
});

export const submitButtonEnabled = style({
  backgroundColor: colors.site.status.success,
  cursor: 'pointer',
});

export const submitButtonDisabled = style({
  backgroundColor: colors.site.gray[400],
  cursor: 'not-allowed',
});
