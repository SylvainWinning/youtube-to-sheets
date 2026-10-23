import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  globalTimeout: process.env.CI ? 5 * 60_000 : 0,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4183/youtube-to-sheets/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 320, height: 568 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'landscape', use: { viewport: { width: 844, height: 390 } } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4183 --strictPort',
    url: 'http://127.0.0.1:4183/youtube-to-sheets/',
    reuseExistingServer: !process.env.CI,
  },
});
