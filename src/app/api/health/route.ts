/**
 * AgroOps — /api/health (HU-25)
 *
 * Endpoint público de healthcheck. Sin auth — los healthcheckers
 * (Telegram cron, Uptime Robot, load balancer) deben poder llamar sin
 * sesión. NO devolvemos secretos ni datos del negocio; solo el estado
 * agregado por componente.
 *
 * HTTP status mapping:
 * - 200 OK    → status === "ok"
 * - 200 OK    → status === "degraded" (operativo pero con avisos)
 * - 503       → status === "down" (DB o Redis caídos — no operativo)
 */
import { NextResponse } from "next/server";
import { runHealthCheck } from "@/server/observability/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await runHealthCheck();
  const httpStatus = report.status === "down" ? 503 : 200;
  return NextResponse.json(report, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
