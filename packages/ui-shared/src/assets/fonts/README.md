Place Jost font files here to self-host the font for the app.

Recommended files and names (drop into this folder):

- jost-regular.woff2 (primary regular weight)
- jost-regular.woff (optional fallback)
- jost-700.woff2 (primary bold weight)
- jost-700.woff (optional fallback)

How to obtain files:

- Use https://google-webfonts-helper.herokuapp.com/fonts/jost to download woff2/woff and a matching @font-face snippet.
- Or download from fonts.google.com and convert to woff2 if necessary.

Notes:

- The CSS in src/index.css expects the above filenames and paths (/fonts/\*.woff2).
- Use woff2 whenever possible for better compression.
- Consider subsetting to latin to reduce size if you only need basic Latin characters.
