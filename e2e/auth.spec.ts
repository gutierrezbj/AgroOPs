/**
 * AgroOps — E2E auth flow (Sprint 5)
 *
 * Login con seed user admin → dashboard renderizado con badge de rol →
 * logout vuelve a /login.
 *
 * Asume seed AgroM cargado (juancho@systemrapid.io / agroops-dev-2026).
 */
import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = "juancho@systemrapid.io";
const ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD ?? "agroops-dev-2026";

test.describe("auth flow", () => {
  test("redirect a /login si no hay sesión y entrada a /dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // El middleware o el server component deben redirigir a login
    await expect(page).toHaveURL(/\/login/);
  });

  test("login admin → dashboard → logout", async ({ page }) => {
    // 1. Página de login renderiza el logo wordmark
    await page.goto("/login");
    await expect(page.getByRole("img", { name: /AgroOps/i })).toBeVisible();

    // 2. Rellenar credenciales y submit
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/contraseña|password/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /entrar|iniciar sesión/i }).click();

    // 3. Aterrizamos en /dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /AgroOps · Dashboard/i }),
    ).toBeVisible();

    // 4. Verificar que el rol admin aparece en la sesión
    await expect(page.getByText("admin")).toBeVisible();

    // 5. Logout vuelve a /login
    await page.getByRole("button", { name: /cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("login con credenciales inválidas mantiene en /login con error", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/contraseña|password/i).fill("password-incorrecta");
    await page.getByRole("button", { name: /entrar|iniciar sesión/i }).click();

    // No deberíamos haber ido a dashboard
    await expect(page).not.toHaveURL(/\/dashboard/);
    // Mensaje de error visible
    await expect(
      page.getByRole("alert").or(page.getByText(/credenciales|inválid/i)),
    ).toBeVisible();
  });
});
