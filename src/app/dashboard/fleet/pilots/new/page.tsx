/**
 * AgroOps — /dashboard/fleet/pilots/new
 *
 * Crear piloto. Server Component aplica RBAC (`WRITERS`).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, ROLES } from "@/lib/rbac";
import { PilotForm } from "@/features/fleet/pilots/components/PilotForm";

export const metadata = {
  title: "AgroOps — Nuevo piloto",
};

export const dynamic = "force-dynamic";

export default async function NewPilotPage() {
  const session = await auth();
  if (!hasRole(session, ROLES.WRITERS)) {
    redirect("/dashboard/fleet/pilots?error=forbidden");
  }

  return (
    <main className="drones-new">
      <header>
        <h1>Nuevo piloto</h1>
        <p>
          <Link href="/dashboard/fleet/pilots">← Volver al listado</Link>
        </p>
      </header>
      <PilotForm mode="create" />
    </main>
  );
}
