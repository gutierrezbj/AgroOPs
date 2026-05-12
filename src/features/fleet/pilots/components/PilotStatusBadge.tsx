/**
 * AgroOps — PilotStatusBadge
 *
 * Estado del piloto en formato badge. `active=false` → "Inactivo".
 * `active=true` puede ir acompañado de una severity derivada de las
 * credenciales (vencidas → "Atención", a punto de vencer → "Aviso").
 */
import type { Pilot } from "@/db/schema/pilots";
import { evaluateCredentials } from "../services";

type Severity = "active" | "warning" | "expired" | "inactive";

function deriveSeverity(pilot: Pilot): Severity {
  if (!pilot.active) return "inactive";
  const credentials = evaluateCredentials(pilot);
  if (credentials.some((c) => c.severity === "expired")) return "expired";
  if (credentials.some((c) => c.severity === "warning")) return "warning";
  return "active";
}

const LABELS: Record<Severity, string> = {
  active: "Activo",
  warning: "Aviso",
  expired: "Atención",
  inactive: "Inactivo",
};

export function PilotStatusBadge({ pilot }: { pilot: Pilot }) {
  const severity = deriveSeverity(pilot);
  return (
    <span
      data-status={severity}
      className={`drone-status drone-status--${
        severity === "active"
          ? "active"
          : severity === "inactive"
            ? "retired"
            : "maintenance"
      }`}
    >
      {LABELS[severity]}
    </span>
  );
}
