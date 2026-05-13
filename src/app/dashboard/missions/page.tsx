/**
 * AgroOps — /dashboard/missions (HU-09)
 */
import Link from "next/link";
import { listMissions } from "@/features/missions/services";
import { MissionsTable } from "@/features/missions/components/MissionsTable";
import { EmptyState } from "@/features/shell/components/EmptyState";

export const metadata = { title: "AgroOps — Misiones" };
export const dynamic = "force-dynamic";

export default async function MissionsListPage() {
  const missions = await listMissions();
  return (
    <main className="drones">
      <header>
        <h1>Misiones</h1>
        <p>
          Operaciones con state machine de 8 estados (draft → planned →
          approved → preflight → in_flight → completed → invoiced;
          cualquier estado → cancelled).
        </p>
        <p>
          <Link href="/dashboard/missions/new" className="btn-primary">
            + Nueva misión
          </Link>
          {" · "}
          <Link href="/dashboard">Volver al dashboard</Link>
        </p>
      </header>
      {missions.length === 0 ? (
        <EmptyState
          icon="🛩"
          title="Aún no hay misiones registradas"
          description="Cuando crees una misión aérea aparecerá aquí con su estado, parcelas, dron, piloto y albarán asociado."
          action={{
            href: "/dashboard/missions/new",
            label: "Crear primera misión",
          }}
        />
      ) : (
        <MissionsTable missions={missions} />
      )}
    </main>
  );
}
