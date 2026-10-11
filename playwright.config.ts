import { defineConfig } from '@playwright/test';

const PORT = 4322;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Systemowy Chrome (bez pobierania przeglądarek); PW_CHANNEL=chromium po `npx playwright install chromium`.
    channel: process.env.PW_CHANNEL ?? 'chrome',
  },
  webServer: {
    command: `npm run build && npx astro preview --port ${PORT} --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
