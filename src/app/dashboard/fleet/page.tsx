/**
 * AgroOps — /dashboard/fleet
 *
 * Índice de fleet management. En Sprint 1 sólo enlaza drones (HU-04).
 * Pilotos llegan en HU-05.
 */
import Link from "next/link";

export const metadata = {
  title: "AgroOps — Flota",
};

export default function FleetIndexPage() {
  return (
    <main className="fleet">
      <header>
        <h1>Flota</h1>
        <p>Gestión de drones y pilotos.</p>
      </header>
      <nav>
        <ul>
          <li>
            <Link href="/dashboard/fleet/drones">Drones</Link> · ABM de
            aeronaves (T50, Mavic 3E, D-RTK 2).
          </li>
          <li>
            Pilotos (HU-05) — pendiente Sprint 1.
          </li>
        </ul>
      </nav>
    </main>
  );
}
