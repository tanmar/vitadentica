import { defineConfig } from 'vitest/config';

// Testy jednostkowe w tests/; specyfikacje Playwright (e2e/) uruchamia `npm run test:e2e`.
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'] },
});
