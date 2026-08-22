import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, timeout: 45_000,
  globalSetup: './e2e/globalSetup.ts',
  expect: { timeout: 10_000 }, reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: { baseURL: 'http://127.0.0.1:5180', trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure', permissions: ['camera', 'microphone'], ...devices['Desktop Chrome'], launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } },
});
