/**
 * Styles for hierarchical question display with battery and sub-battery grouping
 */

import { style } from '@vanilla-extract/css';
import { colors, spacing } from 'ui-shared';

/**
 * Container for battery group - outermost card
 * Visually separates different batteries
 */
export const batteryCard = style({
  padding: spacing.lg,
  marginBottom: spacing.xl,
  backgroundColor: colors.site.gray[0],
  borderRadius: '12px',
  border: `2px solid ${colors.site.gray[300]}`,
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
});

/**
 * Battery prefix text - displayed once at the top of each battery group
 * More prominent than sub-battery prefix
 */
export const batteryPrefix = style({
  fontSize: '1.125rem',
  fontWeight: 600,
  color: colors.site.content.text,
  marginBottom: spacing.lg,
  lineHeight: 1.4,
});

/**
 * Container for sub-battery group - nested card within battery
 * Lighter visual treatment to indicate hierarchy
 */
export const subBatteryCard = style({
  padding: spacing.md,
  marginBottom: spacing.md,
  backgroundColor: colors.site.content.background,
  borderRadius: '8px',
  border: `1px solid ${colors.site.gray[200]}`,

  // Remove bottom margin from last sub-battery card
  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
});

/**
 * Sub-battery prefix text - displayed once at the top of each sub-battery group
 * Less prominent than battery prefix, more than question text
 */
export const subBatteryPrefix = style({
  fontSize: '1rem',
  fontWeight: 500,
  color: colors.site.content.textMuted,
  marginBottom: spacing.md,
  lineHeight: 1.4,
});

/**
 * Container for individual question within a group
 * Reuses existing question card styling pattern
 */
export const questionCard = style({
  padding: spacing.lg,
  backgroundColor: colors.site.gray[100],
  borderRadius: '8px',
  marginBottom: spacing.md,

  // Remove bottom margin from last question
  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
});

/**
 * Question text
 */
export const questionText = style({
  fontWeight: 'bold',
  marginBottom: spacing.sm,
  color: colors.site.content.text,
});

/**
 * Response options list
 */
export const responseList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
});

/**
 * Individual response option
 */
export const responseOption = style({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
  cursor: 'pointer',
  padding: spacing.xs,
  borderRadius: '4px',

  // Hover effect for better UX
  selectors: {
    '&:hover': {
      backgroundColor: colors.site.gray[200],
    },
  },
});

/**
 * Radio input
 */
export const radioInput = style({
  cursor: 'pointer',
  width: '18px',
  height: '18px',
});
