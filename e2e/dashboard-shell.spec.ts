/**
 * AgroOps — E2E dashboard shell smoke test
 *
 * Verifica que las pantallas principales del dashboard cargan sin error
 * para un admin autenticado. No comprueba contenido específico de DB
 * (solo que el HTML llega y no rompe ningún componente cliente).
 *
 * Es la red de seguridad mínima para detectar regresiones de Server
 * Component / hidratación / imports rotos.
 */
import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = "juancho@systemrapid.io";
const ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD ?? "agroops-dev-2026";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/contraseña|password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /entrar|iniciar sesión/i }).click();
  await page.waitForURL(/\/dashboard/);
});

const SCREENS: Array<{ path: string; heading: RegExp }> = [
  { path: "/dashboard", heading: /AgroOps · Dashboard/i },
  { path: "/dashboard/clients", heading: /^clientes$/i },
  { path: "/dashboard/fleet", heading: /^flota$/i },
  { path: "/dashboard/fleet/drones", heading: /^drones$/i },
  { path: "/dashboard/fleet/pilots", heading: /^pilotos$/i },
  { path: "/dashboard/parcels", heading: /parcelas SIGPAC/i },
  { path: "/dashboard/phytosanitary", heading: /catálogo fitosanitario/i },
  { path: "/dashboard/missions", heading: /^misiones$/i },
  { path: "/dashboard/map", heading: /mapa operativo/i },
  { path: "/dashboard/field-notebook", heading: /cuaderno de campo/i },
  { path: "/dashboard/audit-log", heading: /audit log/i },
];

test.describe("dashboard shell smoke", () => {
  for (const { path, heading } of SCREENS) {
    test(`${path} renderiza heading`, async ({ page }) => {
      const responses: number[] = [];
      page.on("response", (r) => {
        if (r.url().endsWith(path)) responses.push(r.status());
      });
      await page.goto(path);
      // El primer response debe ser 200 (server component renderizó)
      expect(responses[0] ?? 200).toBeLessThan(400);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    });
  }
});
