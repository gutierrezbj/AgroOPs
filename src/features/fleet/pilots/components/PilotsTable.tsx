/**
 * AgroOps — PilotsTable
 *
 * Server Component que renderiza la lista de pilotos. Carga delegada al
 * page padre (que llama `listPilots`).
 */
import Link from "next/link";
import type { Pilot } from "@/db/schema/pilots";
import { PilotStatusBadge } from "./PilotStatusBadge";
import { evaluateCredentials } from "../services";

function fmtHours(value: string): string {
  return `${parseFloat(value).toFixed(1)} h`;
}

function fmtCredentialChip(pilot: Pilot): string {
  const credentials = evaluateCredentials(pilot);
  if (credentials.length === 0) return "—";
  const expired = credentials.filter((c) => c.severity === "expired");
  const warning = credentials.filter((c) => c.severity === "warning");
  const parts: string[] = [];
  if (expired.length > 0) parts.push(`${expired.length} vencida(s)`);
  if (warning.length > 0) parts.push(`${warning.length} pronto`);
  if (parts.length === 0) return "OK";
  return parts.join(" · ");
}

export function PilotsTable({ pilots }: { pilots: Pilot[] }) {
  if (pilots.length === 0) {
    return (
      <p className="drones-table__empty">
        No hay pilotos registrados.{" "}
        <Link href="/dashboard/fleet/pilots/new">Crea el primero</Link>.
      </p>
    );
  }

  return (
    <table className="drones-table">
      <caption>Pilotos AgroOps ({pilots.length})</caption>
      <thead>
        <tr>
          <th scope="col">Nombre</th>
          <th scope="col">NIF</th>
          <th scope="col">AESA</th>
          <th scope="col">ROPO</th>
          <th scope="col">Horas</th>
          <th scope="col">Caducidades</th>
          <th scope="col">Estado</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {pilots.map((pilot) => (
          <tr key={pilot.id}>
            <td>
              <strong>{pilot.fullName}</strong>
            </td>
            <td>
              <code>{pilot.nif}</code>
            </td>
            <td>
              {pilot.aesaLicenseClass ? (
                <>
                  <strong>{pilot.aesaLicenseClass}</strong>
                  {pilot.aesaLicenseExpiresAt ? (
                    <>
                      <br />
                      <small>caduca {pilot.aesaLicenseExpiresAt}</small>
                    </>
                  ) : null}
                </>
              ) : (
                "—"
              )}
            </td>
            <td>
              {pilot.ropoQualified ? (
                <>
                  <strong>{pilot.ropoLevel ?? "Sí"}</strong>
                  {pilot.ropoExpiresAt ? (
                    <>
                      <br />
                      <small>caduca {pilot.ropoExpiresAt}</small>
                    </>
                  ) : null}
                </>
              ) : (
                "No"
              )}
            </td>
            <td>{fmtHours(pilot.flightHours)}</td>
            <td>{fmtCredentialChip(pilot)}</td>
            <td>
              <PilotStatusBadge pilot={pilot} />
            </td>
            <td>
              <Link href={`/dashboard/fleet/pilots/${pilot.id}`}>Editar</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
