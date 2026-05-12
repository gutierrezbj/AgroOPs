/**
 * AgroOps — /dashboard/parcels/new (HU-07)
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, ROLES } from "@/lib/rbac";
import { listClients } from "@/features/clients/services";
import { ParcelForm } from "@/features/parcels/components/ParcelForm";

export const metadata = { title: "AgroOps — Nueva parcela" };
export const dynamic = "force-dynamic";

export default async function NewParcelPage() {
  const session = await auth();
  if (!hasRole(session, ROLES.WRITERS)) {
    redirect("/dashboard/parcels?error=forbidden");
  }
  const clients = await listClients();

  if (clients.length === 0) {
    return (
      <main className="drones-new">
        <header>
          <h1>Nueva parcela</h1>
        </header>
        <p>
          Necesitas crear al menos un cliente antes de añadir parcelas.{" "}
          <Link href="/dashboard/clients/new">Crear cliente</Link>.
        </p>
      </main>
    );
  }

  return (
    <main className="drones-new">
      <header>
        <h1>Nueva parcela SIGPAC</h1>
        <p>
          <Link href="/dashboard/parcels">← Volver al listado</Link>
        </p>
      </header>
      <ParcelForm
        mode="create"
        clients={clients.map((c) => ({
          id: c.id,
          name: c.name,
          taxId: c.taxId,
        }))}
      />
    </main>
  );
}
