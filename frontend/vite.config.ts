/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy forwards /api to the FastAPI backend on port 8000. In production the
// SPA is static on S3/CloudFront and calls /api/* through CloudFront
// (ARCH-02/05) — this proxy only affects local dev.
export default defineConfig({
  plugins: [react()],
  // amazon-cognito-identity-js pulls in the `buffer` polyfill package, which
  // references the bare Node global `global` at module scope. Vite/esbuild
  // (unlike webpack/CRA) doesn't auto-polyfill Node globals in the browser, so
  // without this the SDK throws `ReferenceError: global is not defined` the
  // moment it's imported — before React ever mounts. `define` alone only
  // rewrites app source + the production Rollup bundle; dev-mode dependency
  // pre-bundling runs through a separate esbuild pass that needs its own
  // `optimizeDeps.esbuildOptions.define` to pick up the same substitution.
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
