/**
 * AgroOps — DronesTable
 *
 * Server Component que renderiza la lista de drones. Acepta el array ya
 * cargado por la página (Server Component padre llama a `listDrones`).
 * Lógica de fetching fuera para que la tabla sea testeable con datos mock.
 */
import Link from "next/link";
import type { Drone } from "@/db/schema/drones";
import { DroneStatusBadge } from "./DroneStatusBadge";

const EASA_LABEL: Record<string, string> = {
  c0: "C0",
  c1: "C1",
  c2: "C2",
  c3: "C3",
  c4: "C4",
  c5: "C5",
  c6: "C6",
  n_a: "n/a",
};

function fmtKg(grams: number): string {
  return `${(grams / 1000).toFixed(1)} kg`;
}

function fmtLitres(value: string | null): string {
  if (value == null) return "—";
  return `${parseFloat(value).toFixed(1)} L`;
}

function fmtHours(value: string): string {
  return `${parseFloat(value).toFixed(1)} h`;
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return value; // ya viene YYYY-MM-DD
}

export function DronesTable({ drones }: { drones: Drone[] }) {
  if (drones.length === 0) {
    return (
      <p className="drones-table__empty">
        No hay drones registrados.{" "}
        <Link href="/dashboard/fleet/drones/new">Crea el primero</Link>.
      </p>
    );
  }

  return (
    <table className="drones-table">
      <caption>Flota AgroOps ({drones.length})</caption>
      <thead>
        <tr>
          <th scope="col">Modelo</th>
          <th scope="col">Serie</th>
          <th scope="col">MTOM</th>
          <th scope="col">EASA</th>
          <th scope="col">Tanque</th>
          <th scope="col">Aplicador</th>
          <th scope="col">Horas</th>
          <th scope="col">Seguro</th>
          <th scope="col">Estado</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {drones.map((drone) => (
          <tr key={drone.id}>
            <td>
              <strong>{drone.model}</strong>
              <br />
              <small>{drone.manufacturer}</small>
            </td>
            <td>
              <code>{drone.serialNumber}</code>
              {drone.registrationCode ? (
                <>
                  <br />
                  <small>reg: {drone.registrationCode}</small>
                </>
              ) : null}
            </td>
            <td>{fmtKg(drone.mtomGrams)}</td>
            <td>{EASA_LABEL[drone.easaClass] ?? drone.easaClass}</td>
            <td>{fmtLitres(drone.payloadLitres)}</td>
            <td>{drone.applicationCapable ? "Sí" : "No"}</td>
            <td>{fmtHours(drone.flightHours)}</td>
            <td>{fmtDate(drone.insuranceExpiresAt)}</td>
            <td>
              <DroneStatusBadge status={drone.status} />
            </td>
            <td>
              <Link href={`/dashboard/fleet/drones/${drone.id}`}>Editar</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
