import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Set base to your GitHub repo name, e.g. '/football-luck-table/'
// This is read from the VITE_BASE_URL env var at build time,
// falling back to '/' for local dev.
const base = process.env.VITE_BASE_URL ?? '/';

export default defineConfig({
  plugins: [react()],
  base,
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/utils/**'],
    },
  },
});
