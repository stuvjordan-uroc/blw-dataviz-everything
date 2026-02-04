import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 3001,
    open: true,
    proxy: {
      // Proxy API requests to local Docker container
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
});
