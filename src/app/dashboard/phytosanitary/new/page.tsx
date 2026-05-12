/**
 * AgroOps — /dashboard/phytosanitary/new (HU-08)
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, ROLES } from "@/lib/rbac";
import { PhytoProductForm } from "@/features/phytosanitary/components/PhytoProductForm";

export const metadata = { title: "AgroOps — Nuevo lote fitosanitario" };
export const dynamic = "force-dynamic";

export default async function NewPhytoPage() {
  const session = await auth();
  if (!hasRole(session, ROLES.WRITERS)) {
    redirect("/dashboard/phytosanitary?error=forbidden");
  }
  return (
    <main className="drones-new">
      <header>
        <h1>Nuevo lote fitosanitario</h1>
        <p>
          <Link href="/dashboard/phytosanitary">← Volver al listado</Link>
        </p>
      </header>
      <PhytoProductForm mode="create" />
    </main>
  );
}
