import { globalFontFace } from '@vanilla-extract/css';

// Import font files as URLs
import jostRegularWoff2 from '../assets/fonts/jost-regular.woff2';
import jostRegularWoff from '../assets/fonts/jost-regular.woff';
import jostItalicWoff2 from '../assets/fonts/jost-italic.woff2';
import jostItalicWoff from '../assets/fonts/jost-italic.woff';
import jost700Woff2 from '../assets/fonts/jost-700.woff2';
import jost700Woff from '../assets/fonts/jost-700.woff';

// Jost Regular (400)
globalFontFace('Jost', {
  src: `url('${jostRegularWoff2}') format('woff2'),
        url('${jostRegularWoff}') format('woff')`,
  fontWeight: 400,
  fontStyle: 'normal',
  fontDisplay: 'swap',
});

// Jost Italic (400)
globalFontFace('Jost', {
  src: `url('${jostItalicWoff2}') format('woff2'),
        url('${jostItalicWoff}') format('woff')`,
  fontWeight: 400,
  fontStyle: 'italic',
  fontDisplay: 'swap',
});

// Jost Bold (700)
globalFontFace('Jost', {
  src: `url('${jost700Woff2}') format('woff2'),
        url('${jost700Woff}') format('woff')`,
  fontWeight: 700,
  fontStyle: 'normal',
  fontDisplay: 'swap',
});
