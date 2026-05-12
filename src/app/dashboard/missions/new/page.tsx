/**
 * AgroOps — /dashboard/missions/new (HU-09)
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, ROLES } from "@/lib/rbac";
import { listClients } from "@/features/clients/services";
import { listDrones } from "@/features/fleet/services";
import { listPilots } from "@/features/fleet/pilots/services";
import { MissionForm } from "@/features/missions/components/MissionForm";

export const metadata = { title: "AgroOps — Nueva misión" };
export const dynamic = "force-dynamic";

export default async function NewMissionPage() {
  const session = await auth();
  if (!hasRole(session, ROLES.WRITERS)) {
    redirect("/dashboard/missions?error=forbidden");
  }

  const [clients, drones, pilots] = await Promise.all([
    listClients(),
    listDrones({ status: "active" }),
    listPilots({ active: true }),
  ]);

  if (clients.length === 0) {
    return (
      <main className="drones-new">
        <header>
          <h1>Nueva misión</h1>
        </header>
        <p>
          Necesitas crear al menos un cliente antes de planificar misiones.{" "}
          <Link href="/dashboard/clients/new">Crear cliente</Link>.
        </p>
      </main>
    );
  }

  return (
    <main className="drones-new">
      <header>
        <h1>Nueva misión</h1>
        <p>
          <Link href="/dashboard/missions">← Volver al listado</Link>
        </p>
        <p>
          <small>
            Tras crear el borrador podrás asignar parcelas y planificar la
            misión desde la vista de edición.
          </small>
        </p>
      </header>

      <MissionForm
        mode="create"
        clients={clients.map((c) => ({ id: c.id, name: c.name, taxId: c.taxId }))}
        drones={drones.map((d) => ({
          id: d.id,
          model: d.model,
          serialNumber: d.serialNumber,
          applicationCapable: d.applicationCapable,
          status: d.status,
        }))}
        pilots={pilots.map((p) => ({
          id: p.id,
          fullName: p.fullName,
          nif: p.nif,
          ropoQualified: p.ropoQualified,
          active: p.active,
        }))}
      />
    </main>
  );
}
