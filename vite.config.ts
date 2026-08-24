/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5193,
    strictPort: true,
  },
  test: {
    environment: 'node',
    exclude: ['node_modules/**', 'dist/**'],
  },
});
