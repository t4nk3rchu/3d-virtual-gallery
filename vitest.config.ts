import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      // React component tests run in jsdom
      ['src/components/**/*.test.tsx', 'jsdom'],
      ['src/components/**/*.test.ts', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
    },
    testTimeout: 30000,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', 'dist', '.wrangler'],
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
