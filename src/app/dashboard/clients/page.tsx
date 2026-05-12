/**
 * AgroOps — /dashboard/clients (HU-06)
 */
import Link from "next/link";
import { listClients } from "@/features/clients/services";
import { ClientsTable } from "@/features/clients/components/ClientsTable";

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
      <ClientsTable clients={clients} />
    </main>
  );
}
