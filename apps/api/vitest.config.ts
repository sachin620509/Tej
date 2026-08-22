import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./tests/globalSetup.ts'],
    hookTimeout: 30_000,
    testTimeout: 30_000,
    maxWorkers: 1,
    passWithNoTests: true,
  },
});
