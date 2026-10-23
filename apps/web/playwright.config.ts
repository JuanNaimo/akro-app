import { defineConfig, devices } from "@playwright/test";
import { E2E_DATABASE_URL } from "./e2e/global-setup";

const WEB_PORT = 3100;
const API_PORT = 3101;
const WEB_ORIGIN = `http://localhost:${WEB_PORT}`;
const API_ORIGIN = `http://localhost:${API_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: WEB_ORIGIN,
    trace: "retain-on-failure",
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: [
    {
      // API compilado y sin watch. Redis y MinIO no hacen falta. /api/health da 503 sin
      // ellos; /api/auth/me da 401, que Playwright cuenta como servidor listo.
      command: "pnpm build && pnpm start:prod",
      cwd: "../api",
      url: `${API_ORIGIN}/api/auth/me`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        PORT: String(API_PORT),
        DATABASE_URL: E2E_DATABASE_URL,
        REDIS_URL: "redis://localhost:6379",
        S3_ENDPOINT: "http://localhost:9000",
        S3_ACCESS_KEY: "test",
        S3_SECRET_KEY: "test",
        S3_BUCKET: "akro-test",
        SMTP_URL: "smtp://localhost:2525",
        WEB_ORIGIN,
      },
    },
    {
      command: `pnpm exec next dev -p ${WEB_PORT}`,
      url: `${WEB_ORIGIN}/login`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { API_INTERNAL_URL: API_ORIGIN },
    },
  ],
});
