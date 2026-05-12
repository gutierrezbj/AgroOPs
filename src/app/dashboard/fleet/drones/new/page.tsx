/**
 * AgroOps — /dashboard/fleet/drones/new
 *
 * Crear nuevo dron. Server Component que aplica RBAC (sólo `WRITERS` pueden
 * ver el form) y renderiza el client component `DroneForm`.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, ROLES } from "@/lib/rbac";
import { DroneForm } from "@/features/fleet/components/DroneForm";

export const metadata = {
  title: "AgroOps — Nuevo dron",
};

export const dynamic = "force-dynamic";

export default async function NewDronePage() {
  const session = await auth();
  if (!hasRole(session, ROLES.WRITERS)) {
    redirect("/dashboard/fleet/drones?error=forbidden");
  }

  return (
    <main className="drones-new">
      <header>
        <h1>Nuevo dron</h1>
        <p>
          <Link href="/dashboard/fleet/drones">← Volver al listado</Link>
        </p>
      </header>

      <DroneForm mode="create" />
    </main>
  );
}
