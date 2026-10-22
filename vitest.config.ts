import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    // Not Manila, so a test that leaks the process zone fails (spec §8.2).
    env: { TZ: 'Asia/Dubai' },
    globals: true,
    include: ['tests/unit/**/*.{spec,test}.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
  },
});
