import { defineConfig, devices } from '@playwright/test';

const API = 'http://localhost:8100';
const WEB = 'http://localhost:3100';

export default defineConfig({
  testDir: './e2e',
  // One shared database: specs must not race each other's writes.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: WEB, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'uv run uvicorn src.main:app --port 8100 --no-access-log',
      cwd: '../pikol-backend',
      url: `${API}/health/ready`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: 'postgresql+asyncpg://pikol:pikol@localhost:5433/pikol_e2e',
        CORS_ALLOWED_ORIGINS: `["${WEB}"]`,
        FRONTEND_BASE_URL: WEB,
        API_BASE_URL: API,
        JWT_SECRET: 'e2e-only-secret-not-for-any-real-deployment',
        EMAIL_PROVIDER: 'console',
        PAYMENT_PROVIDER: 'mock',
        MOCK_CHECKOUT_ENABLED: 'false',
        // Every spec signs in from one IP; the login limiter would refuse them.
        RATE_LIMIT_ENABLED: 'false',
        DEBUG: 'false',
      },
    },
    {
      command: 'npm run build && npx next start -p 3100',
      url: `${WEB}/login`,
      reuseExistingServer: false,
      timeout: 240_000,
      env: { NEXT_DIST_DIR: '.next-e2e', NEXT_PUBLIC_API_BASE_URL: `${API}/api/v1` },
    },
  ],
});
