/**
 * AgroOps — Playwright E2E config (Sprint 5)
 *
 * Tests E2E críticos: auth, healthcheck, cuaderno PAC, ABM parcelas full.
 * Asumimos que Postgres + Redis están arriba en los puertos SRS (6170/6171)
 * y que el seed AgroM está cargado (3 users + flota + cliente demo).
 *
 * `webServer` arranca `pnpm dev` automáticamente si no está ya corriendo en
 * `localhost:3000`. Configuramos timeout amplio porque el primer build de
 * Next.js 16 puede tardar 30+ segundos.
 *
 * En CI desactivamos `webServer.reuseExistingServer` para que cada run
 * arranque uno limpio; en local lo reusamos para iterar rápido.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  workers: IS_CI ? 1 : undefined,
  reporter: IS_CI ? [["github"], ["list"]] : "list",
  timeout: 30_000,
  expect: {
    timeout: 7_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: IS_CI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm next dev",
    url: BASE_URL,
    reuseExistingServer: !IS_CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
