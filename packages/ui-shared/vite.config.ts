import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    vanillaExtractPlugin(),
    dts({
      include: ['src'],
      outDir: 'dist',
      rollupTypes: true
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'style.css';
          // Keep font files in fonts/ directory
          if (assetInfo.name && /\.(woff2?|ttf|eot)$/.test(assetInfo.name)) {
            return 'fonts/[name][extname]';
          }
          return 'assets/[name][extname]';
        }
      }
    },
    // Copy font assets to dist
    copyPublicDir: false,
    assetsInlineLimit: 0, // Don't inline fonts as base64
  },
  // Ensure fonts are treated as assets
  assetsInclude: ['**/*.woff', '**/*.woff2']
});
