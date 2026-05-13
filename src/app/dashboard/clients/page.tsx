/**
 * AgroOps — /dashboard/clients (HU-06)
 */
import Link from "next/link";
import { listClients } from "@/features/clients/services";
import { ClientsTable } from "@/features/clients/components/ClientsTable";
import { EmptyState } from "@/features/shell/components/EmptyState";

export const metadata = { title: "AgroOps — Clientes" };
export const dynamic = "force-dynamic";

export default async function ClientsListPage() {
  const clients = await listClients();
  return (
    <main className="drones">
      <header>
        <h1>Clientes</h1>
        <p>
          Cooperativas, ATRIA, agricultores, comunidades de regantes. Base de
          contactos comerciales para misiones y facturación Holded.
        </p>
        <p>
          <Link href="/dashboard/clients/new" className="btn-primary">
            + Nuevo cliente
          </Link>
          {" · "}
          <Link href="/dashboard">Volver al dashboard</Link>
        </p>
      </header>
      {clients.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No hay clientes en el directorio"
          description="Los clientes son cooperativas, ATRIA, agricultores individuales o comunidades de regantes a los que prestáis servicio. Cada cliente tiene parcelas asociadas que se aplicarán en las misiones."
          action={{
            href: "/dashboard/clients/new",
            label: "Crear primer cliente",
          }}
        />
      ) : (
        <ClientsTable clients={clients} />
      )}
    </main>
  );
}
