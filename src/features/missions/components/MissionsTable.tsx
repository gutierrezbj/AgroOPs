/**
 * AgroOps — MissionsTable
 */
import Link from "next/link";
import type { MissionListItem } from "../services";
import { MissionStatusBadge } from "./MissionStatusBadge";

function fmtDateTime(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtHa(value: string | null): string {
  if (!value) return "—";
  return `${parseFloat(value).toFixed(2)} ha`;
}

export function MissionsTable({ missions }: { missions: MissionListItem[] }) {
  if (missions.length === 0) {
    return (
      <p className="drones-table__empty">
        No hay misiones registradas.{" "}
        <Link href="/dashboard/missions/new">Crea la primera</Link>.
      </p>
    );
  }

  return (
    <table className="drones-table">
      <caption>Misiones ({missions.length})</caption>
      <thead>
        <tr>
          <th scope="col">Código</th>
          <th scope="col">Cliente</th>
          <th scope="col">Programada</th>
          <th scope="col">Dron</th>
          <th scope="col">Piloto</th>
          <th scope="col">Parcelas</th>
          <th scope="col">Área</th>
          <th scope="col">Estado</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {missions.map((m) => (
          <tr key={m.id}>
            <td>
              <code>{m.code}</code>
            </td>
            <td>{m.clientName}</td>
            <td>{fmtDateTime(m.scheduledAt)}</td>
            <td>{m.droneModel ?? "—"}</td>
            <td>{m.pilotName ?? "—"}</td>
            <td>{m.parcelCount}</td>
            <td>{fmtHa(m.parcelsArea)}</td>
            <td>
              <MissionStatusBadge status={m.status} />
            </td>
            <td>
              <Link href={`/dashboard/missions/${m.id}`}>Abrir</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
