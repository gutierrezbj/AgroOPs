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
import { EmptyState } from "@/features/shell/components/EmptyState";

export const metadata = {
  title: "AgroOps — Pilotos",
};

export const dynamic = "force-dynamic";

export default async function PilotsListPage() {
  const pilots = await listPilots();

  return (
    <main className="dashboard-listing">
      <header>
        <h1>Pilotos</h1>
        <p>
          Pilotos de la flota con cualificaciones AESA (licencia + clase),
          ROPO (Registro Oficial de Productores y Operadores), seguro civil y
          reconocimiento médico.
        </p>
        <p>
          <Link href="/dashboard/fleet/pilots/new" className="btn-primary">
            + Nuevo piloto
          </Link>
          {" · "}
          <Link href="/dashboard/fleet">Volver a flota</Link>
        </p>
      </header>
      {pilots.length === 0 ? (
        <EmptyState
          icon="👨‍✈️"
          title="No hay pilotos registrados"
          description="Para aprobar una misión necesitas al menos un piloto con cualificación ROPO activa. Cada piloto puede tener cuenta de usuario asociada o ser operador externo invitado."
          action={{
            href: "/dashboard/fleet/pilots/new",
            label: "Añadir primer piloto",
          }}
        />
      ) : (
        <PilotsTable pilots={pilots} />
      )}
    </main>
  );
}
