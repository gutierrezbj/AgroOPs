/**
 * AgroOps — DroneStatusBadge
 *
 * Componente UI pequeño que muestra el estado del dron con clase CSS por valor.
 * Sin styling final — Identity Sprint bloquea tokens definitivos.
 */
import type { DroneStatus } from "@/db/schema/drones";

const LABELS: Record<DroneStatus, string> = {
  active: "Activo",
  maintenance: "Mantenimiento",
  retired: "Retirado",
};

export function DroneStatusBadge({ status }: { status: DroneStatus }) {
  return (
    <span
      data-status={status}
      className={`drone-status drone-status--${status}`}
    >
      {LABELS[status]}
    </span>
  );
}
