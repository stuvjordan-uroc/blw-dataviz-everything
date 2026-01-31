import { globalStyle } from '@vanilla-extract/css';

// Modern CSS Reset
// Based on https://piccalil.li/blog/a-modern-css-reset/

globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
  margin: 0,
  padding: 0
});

globalStyle('html, body', {
  height: '100%'
});

globalStyle('body', {
  fontFamily: '"Jost", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  lineHeight: 1.5,
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale'
});

globalStyle('img, picture, video, canvas, svg', {
  display: 'block',
  maxWidth: '100%'
});

globalStyle('input, button, textarea, select', {
  font: 'inherit'
});

globalStyle('p, h1, h2, h3, h4, h5, h6', {
  overflowWrap: 'break-word'
});

globalStyle('#root', {
  isolation: 'isolate'
});

// Form control resets
globalStyle('button', {
  cursor: 'pointer',
  border: 'none',
  background: 'none'
});

globalStyle('input, textarea, select', {
  border: '1px solid #ccc',
  borderRadius: '4px',
  padding: '0.5rem'
});

globalStyle('input:focus, textarea:focus, select:focus', {
  outline: '2px solid currentColor',
  outlineOffset: '2px'
});
