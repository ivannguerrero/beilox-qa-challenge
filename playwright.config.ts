import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

const swapiBaseUrl = process.env.SWAPI_BASE_URL ?? 'https://www.swapi.tech/api';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'ui',
      testDir: './tests/ui',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL ?? 'https://www.centraldepasajes.com.ar',
      },
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: swapiBaseUrl.endsWith('/') ? swapiBaseUrl : `${swapiBaseUrl}/`,
      },
    },
  ],
});