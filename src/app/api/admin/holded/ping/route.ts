/**
 * AgroOps — /api/admin/holded/ping (HU-18)
 *
 * Endpoint de diagnóstico para validar que la integración Holded está
 * configurada y la API key responde. Solo accesible para `admin` —
 * cualquier otro rol recibe 403. No expone la API key en la respuesta.
 *
 * Útil para:
 * - Banner de salud en `/dashboard` (futuro)
 * - Healthcheck Telegram (HU-25)
 * - Debug rápido sin tocar Holded directamente
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ROLES, hasRole } from "@/lib/rbac";
import {
  isHoldedConfigured,
  pingHolded,
} from "@/server/integrations/holded";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!hasRole(session, ROLES.ADMIN_ONLY)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const configured = isHoldedConfigured();
  if (!configured) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        reason: "not-configured",
        message: "HOLDED_API_KEY no definida en .env.local",
      },
      { status: 200, headers: { "Cache-Control": "private, no-cache" } },
    );
  }

  const result = await pingHolded();

  return NextResponse.json(
    {
      ...result,
      configured: true,
    },
    {
      status: 200,
      headers: { "Cache-Control": "private, no-cache" },
    },
  );
}
