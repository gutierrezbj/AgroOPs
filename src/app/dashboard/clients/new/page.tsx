/**
 * AgroOps — /dashboard/clients/new (HU-06)
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, ROLES } from "@/lib/rbac";
import { ClientForm } from "@/features/clients/components/ClientForm";

export const metadata = { title: "AgroOps — Nuevo cliente" };
export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const session = await auth();
  if (!hasRole(session, ROLES.WRITERS)) {
    redirect("/dashboard/clients?error=forbidden");
  }
  return (
    <main className="drones-new">
      <header>
        <h1>Nuevo cliente</h1>
        <p>
          <Link href="/dashboard/clients">← Volver al listado</Link>
        </p>
      </header>
      <ClientForm mode="create" />
    </main>
  );
}
