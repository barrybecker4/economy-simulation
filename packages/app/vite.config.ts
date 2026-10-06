import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Relative asset URLs, so a copy of dist/ works in any directory on a static host.
  // The dev server still serves from /.
  base: './',
  plugins: [svelte()],
  resolve: {
    alias: {
      '@economy-simulation/core': path.resolve(root, '../core/src/index.ts'),
    },
  },
});
