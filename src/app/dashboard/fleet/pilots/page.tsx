/**
 * AgroOps — /dashboard/fleet/pilots
 *
 * Lista de pilotos. Server Component: carga datos vía service y los pasa
 * al componente de tabla. Middleware ya garantiza sesión; mutaciones tienen
 * su propio RBAC.
 */
import Link from "next/link";
import { listPilots } from "@/features/fleet/pilots/services";
import { PilotsTable } from "@/features/fleet/pilots/components/PilotsTable";

export const metadata = {
  title: "AgroOps — Pilotos",
};

export const dynamic = "force-dynamic";

export default async function PilotsListPage() {
  const pilots = await listPilots();

  return (
    <main className="drones">
      <header>
        <h1>Pilotos</h1>
        <p>
          Pilotos de la flota AgroOps con cualificaciones AESA, ROPO, seguro
          y reconocimiento médico.
        </p>
        <p>
          <Link href="/dashboard/fleet/pilots/new" className="btn-primary">
            + Nuevo piloto
          </Link>
          {" · "}
          <Link href="/dashboard/fleet">Volver a flota</Link>
        </p>
      </header>

      <PilotsTable pilots={pilots} />
    </main>
  );
}
