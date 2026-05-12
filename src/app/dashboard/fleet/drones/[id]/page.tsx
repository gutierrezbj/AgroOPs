/**
 * AgroOps — /dashboard/fleet/drones/[id]
 *
 * Editar dron existente. Server Component:
 * - Aplica RBAC: lectura para todos, edición requiere `WRITERS` (lo valida
 *   la action). Si no es `WRITERS`, mostramos sólo info sin form.
 * - Carga el dron por id; si no existe, 404.
 * - Renderiza `DroneForm` en modo edit con `drone` precargado.
 * - Muestra opción de archivar si el usuario es `admin` y el dron no está
 *   ya en `retired`.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, ROLES } from "@/lib/rbac";
import { DroneForm } from "@/features/fleet/components/DroneForm";
import { DroneStatusBadge } from "@/features/fleet/components/DroneStatusBadge";
import { ArchiveDroneButton } from "@/features/fleet/components/ArchiveDroneButton";
import { getDrone } from "@/features/fleet/services";

export const metadata = {
  title: "AgroOps — Dron",
};

export const dynamic = "force-dynamic";

interface EditDronePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDronePage({ params }: EditDronePageProps) {
  const { id } = await params;
  const drone = await getDrone(id);
  if (!drone) {
    notFound();
  }

  const session = await auth();
  const canWrite = hasRole(session, ROLES.WRITERS);
  const canAdmin = hasRole(session, ROLES.ADMIN_ONLY);

  return (
    <main className="drone-edit">
      <header>
        <h1>
          {drone.model} <small>({drone.serialNumber})</small>
        </h1>
        <p>
          <DroneStatusBadge status={drone.status} />
          {" · "}
          <Link href="/dashboard/fleet/drones">← Volver al listado</Link>
        </p>
      </header>

      {canWrite ? (
        <DroneForm mode="edit" drone={drone} />
      ) : (
        <section>
          <p>
            No tienes permisos para editar drones (requiere rol{" "}
            <code>admin</code> u <code>operario</code>).
          </p>
          <dl>
            <dt>Modelo</dt>
            <dd>{drone.model}</dd>
            <dt>Fabricante</dt>
            <dd>{drone.manufacturer}</dd>
            <dt>Serie</dt>
            <dd>
              <code>{drone.serialNumber}</code>
            </dd>
            <dt>MTOM</dt>
            <dd>{(drone.mtomGrams / 1000).toFixed(1)} kg</dd>
            <dt>EASA</dt>
            <dd>{drone.easaClass}</dd>
            <dt>Aplicador</dt>
            <dd>{drone.applicationCapable ? "Sí" : "No"}</dd>
            <dt>Horas de vuelo</dt>
            <dd>{parseFloat(drone.flightHours).toFixed(1)} h</dd>
          </dl>
        </section>
      )}

      {canAdmin && drone.status !== "retired" ? (
        <section className="drone-edit__danger">
          <h2>Zona de archivo</h2>
          <p>
            Archivar el dron lo marca como <code>retired</code>. No se borra
            de la base de datos (las misiones históricas siguen referenciándolo)
            pero queda fuera de selección para misiones nuevas.
          </p>
          <ArchiveDroneButton droneId={drone.id} />
        </section>
      ) : null}
    </main>
  );
}
