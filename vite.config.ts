import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/@babylonjs/core')) {
            return 'babylon-core';
          }
          if (
            id.includes('node_modules/@babylonjs/loaders') ||
            id.includes('node_modules/@babylonjs/materials') ||
            id.includes('node_modules/@babylonjs/post-processes')
          ) {
            return 'babylon-loaders';
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'ui-vendor';
          }
        },
      },
    },
  },
  // Self-host Babylon decoder assets
  assetsInclude: ['**/*.wasm', '**/*.basis'],
});
