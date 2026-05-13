/**
 * AgroOps — /dashboard/fleet/drones
 *
 * Lista de drones de la flota. Server Component: carga datos vía service
 * y los pasa al componente de tabla.
 *
 * Acceso: middleware ya garantiza sesión. La página no aplica RBAC para
 * lectura (cualquier rol autenticado puede ver la flota). Las mutaciones
 * (crear/editar/archivar) sí validan rol en sus Server Actions.
 */
import Link from "next/link";
import { listDrones } from "@/features/fleet/services";
import { DronesTable } from "@/features/fleet/components/DronesTable";
import { EmptyState } from "@/features/shell/components/EmptyState";

export const metadata = {
  title: "AgroOps — Drones",
};

export const dynamic = "force-dynamic"; // sesión siempre fresca, sin cache estático

export default async function DronesListPage() {
  const drones = await listDrones();

  return (
    <main className="dashboard-listing">
      <header>
        <h1>Drones</h1>
        <p>
          Flota UAS y activos de soporte (D-RTK 2, etc.). Cada dron registra
          MTOM, clase EASA, seguros, horas de vuelo y estado operativo.
        </p>
        <p>
          <Link href="/dashboard/fleet/drones/new" className="btn-primary">
            + Nuevo dron
          </Link>
          {" · "}
          <Link href="/dashboard/fleet">Volver a flota</Link>
        </p>
      </header>
      {drones.length === 0 ? (
        <EmptyState
          icon="🚁"
          title="No hay drones en la flota"
          description="Da de alta tu primer dron aplicador (T50, T40), de inspección (Mavic 3E) o estación RTK (D-RTK 2). Sin drones no se pueden crear misiones aéreas."
          action={{
            href: "/dashboard/fleet/drones/new",
            label: "Añadir primer dron",
          }}
        />
      ) : (
        <DronesTable drones={drones} />
      )}
    </main>
  );
}
