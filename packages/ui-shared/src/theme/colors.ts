/**
 * Color palette for the UIs
 * 
 * Colors are organized into two namespaces:
 * - `site`: Colors for UI chrome, controls, and site elements
 * - `viz`: Colors for data visualization elements (points, bars, lines, etc.)
 */
export const colors = {
  /**
   * Site colors - for UI elements, controls, backgrounds, text
   */
  site: {
    // Grays (blw-gray from legacy palette)
    gray: {
      0: 'hsl(0, 0%, 98%)',
      100: 'hsl(192, 7%, 94%)',
      200: 'hsl(192, 7%, 90%)',
      300: 'hsl(192, 7%, 86%)',
      400: 'hsl(192, 7%, 82%)',
      500: 'hsl(192, 7%, 78%)',
      600: 'hsl(192, 7%, 74%)',
      700: 'hsl(192, 7%, 70%)',
      800: 'hsl(192, 7%, 66%)',
      900: 'hsl(192, 7%, 62%)',
    },

    // Whale - Primary brand blue
    whale: {
      0: 'hsl(194, 97%, 98%)',
      100: 'hsl(194, 97%, 90%)',
      200: 'hsl(194, 97%, 75%)',
      300: 'hsl(194, 97%, 65%)',
      400: 'hsl(194, 97%, 60%)',
      500: 'hsl(194, 97%, 50%)',
      600: 'hsl(194, 97%, 40%)',
      700: 'hsl(194, 97%, 22%)',
      800: 'hsl(194, 97%, 18%)',
      900: 'hsl(194, 97%, 10%)',
    },

    // Goldenrod - Accent/highlight color
    goldenrod: {
      100: 'hsl(55, 45%, 95%)',
      200: 'hsl(55, 55%, 85%)',
      300: 'hsl(55, 50%, 75%)',
      400: 'hsl(55, 65%, 70%)',
      500: 'hsl(55, 65%, 55%)',
      600: 'hsl(55, 74%, 28%)',
      700: 'hsl(55, 74%, 18%)',
      800: 'hsl(55, 74%, 12%)',
      900: 'hsl(55, 74%, 6%)',
    },

    /**
     * Frame colors - for header and margins (dark theme)
     */
    frame: {
      background: 'hsl(194, 97%, 18%)',  // whale800
      text: 'hsl(192, 7%, 94%)',         // gray100
      accent: 'hsl(55, 65%, 55%)',       // goldenrod500 - for highlights
    },

    /**
     * Content colors - for main content column (light theme)
     */
    content: {
      background: '#ffffff',
      text: 'hsl(194, 97%, 10%)',        // whale900
      textMuted: 'hsl(192, 7%, 62%)',    // gray900 - secondary text
      border: 'hsl(192, 7%, 86%)',       // gray300
    },

    /**
     * Interactive elements - buttons, links, focus states
     */
    interactive: {
      primary: 'hsl(194, 97%, 22%)',     // whale700 - primary button background
      primaryText: '#ffffff',             // white text on primary buttons
      primaryHover: 'hsl(194, 97%, 40%)', // whale600 - hover state
      link: 'hsl(194, 97%, 40%)',        // whale600 - hyperlinks
      linkHover: 'hsl(194, 97%, 50%)',   // whale500 - link hover
      focus: 'hsl(194, 97%, 60%)',       // whale400 - focus rings
    },

    /**
     * Status colors - success, error, warning, info
     */
    status: {
      success: '#10b981',
      error: '#ef4444',
      warning: 'hsl(55, 65%, 55%)',      // goldenrod500
      info: 'hsl(194, 97%, 50%)',        // whale500
    },
  },

  /**
   * Visualization colors - for data points, bars, lines, and other viz elements
   * DO NOT use these for site UI elements
   * 
   * Based on Material Design color system - each hue has 10 shades (50-900)
   * for encoding both category (hue) and magnitude/variation (lightness)
   */
  viz: {
    // Material Red
    red: {
      50: '#ffebee',
      100: '#ffcdd2',
      200: '#ef9a9a',
      300: '#e57373',
      400: '#ef5350',
      500: '#f44336',
      600: '#e53935',
      700: '#d32f2f',
      800: '#c62828',
      900: '#b71c1c',
    },

    // Material Purple
    purple: {
      50: '#f3e5f5',
      100: '#e1bee7',
      200: '#ce93d8',
      300: '#ba68c8',
      400: '#ab47bc',
      500: '#9c27b0',
      600: '#8e24aa',
      700: '#7b1fa2',
      800: '#6a1b9a',
      900: '#4a148c',
    },

    // Material Blue
    blue: {
      50: '#e3f2fd',
      100: '#bbdefb',
      200: '#90caf9',
      300: '#64b5f6',
      400: '#42a5f5',
      500: '#2196f3',
      600: '#1e88e5',
      700: '#1976d2',
      800: '#1565c0',
      900: '#0d47a1',
    },

    // Material Cyan
    cyan: {
      50: '#e0f7fa',
      100: '#b2ebf2',
      200: '#80deea',
      300: '#4dd0e1',
      400: '#26c6da',
      500: '#00bcd4',
      600: '#00acc1',
      700: '#0097a7',
      800: '#00838f',
      900: '#006064',
    },

    // Material Green
    green: {
      50: '#e8f5e9',
      100: '#c8e6c9',
      200: '#a5d6a7',
      300: '#81c784',
      400: '#66bb6a',
      500: '#4caf50',
      600: '#43a047',
      700: '#388e3c',
      800: '#2e7d32',
      900: '#1b5e20',
    },

    // Material Amber
    amber: {
      50: '#fff8e1',
      100: '#ffecb3',
      200: '#ffe082',
      300: '#ffd54f',
      400: '#ffca28',
      500: '#ffc107',
      600: '#ffb300',
      700: '#ffa000',
      800: '#ff8f00',
      900: '#ff6f00',
    },
  },
} as const;

export type ColorPalette = typeof colors;
