/**
 * AgroOps — E2E cuaderno de campo PAC (HU-21 + HU-22)
 *
 * Verifica que:
 * - El cuaderno requiere auth.
 * - El admin puede acceder a /dashboard/field-notebook.
 * - La página renderiza el resumen agregado + form de filtros.
 * - El endpoint PDF responde 200 con Content-Type application/pdf.
 *
 * No comprobamos contenido del PDF (binario) — solo que se sirve.
 */
import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = "juancho@systemrapid.io";
const ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD ?? "agroops-dev-2026";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/contraseña|password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /entrar|iniciar sesión/i }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe("cuaderno de campo", () => {
  test("require auth (sin sesión redirige a /login)", async ({ page }) => {
    await page.goto("/dashboard/field-notebook");
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin ve la página con resumen + filtros", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/field-notebook");
    await expect(
      page.getByRole("heading", { name: /cuaderno de campo/i }),
    ).toBeVisible();

    // Resumen agregado: al menos los dt "Aplicaciones" / "Misiones"
    await expect(page.getByText(/aplicaciones/i).first()).toBeVisible();
    await expect(page.getByText(/misiones/i).first()).toBeVisible();
    await expect(page.getByText(/parcelas/i).first()).toBeVisible();

    // Form de filtros con campos esperados
    await expect(page.getByLabel(/desde/i)).toBeVisible();
    await expect(page.getByLabel(/hasta/i)).toBeVisible();
    await expect(page.getByLabel(/cliente/i)).toBeVisible();
  });

  test("export PDF responde 200 application/pdf", async ({
    page,
    request,
  }) => {
    await loginAsAdmin(page);
    // Reusamos las cookies de la sesión del navegador para que la request
    // pase el auth gate.
    const cookies = await page.context().cookies();
    const cookieHeader = cookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const res = await request.get("/api/field-notebook/pdf", {
      headers: { cookie: cookieHeader },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
    const buf = await res.body();
    // PDF mínimo (sin entradas) debe pesar > 0 bytes y empezar con "%PDF-"
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });

  test("PDF respeta filtros via query params", async ({ page, request }) => {
    await loginAsAdmin(page);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const res = await request.get(
      "/api/field-notebook/pdf?dateFrom=2026-01-01&dateTo=2026-12-31",
      {
        headers: { cookie: cookieHeader },
      },
    );
    expect(res.status()).toBe(200);
    expect(res.headers()["content-disposition"]).toMatch(/2026-01-01/);
    expect(res.headers()["content-disposition"]).toMatch(/2026-12-31/);
  });

  test("filtros inválidos devuelven 400", async ({ page, request }) => {
    await loginAsAdmin(page);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const res = await request.get(
      "/api/field-notebook/pdf?dateFrom=2026-06-01&dateTo=2026-01-01",
      {
        headers: { cookie: cookieHeader },
      },
    );
    expect(res.status()).toBe(400);
  });
});
