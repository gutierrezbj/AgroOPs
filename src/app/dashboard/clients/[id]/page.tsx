/**
 * AgroOps — /dashboard/clients/[id] (HU-06)
 *
 * Editar cliente. Sin zona de archivo (los clientes no se archivan en v1,
 * los protege la FK desde parcels + missions).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, ROLES } from "@/lib/rbac";
import { ClientForm } from "@/features/clients/components/ClientForm";
import { ClientTypeBadge } from "@/features/clients/components/ClientTypeBadge";
import { getClient } from "@/features/clients/services";

export const metadata = { title: "AgroOps — Cliente" };
export const dynamic = "force-dynamic";

interface EditClientPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const session = await auth();
  const canWrite = hasRole(session, ROLES.WRITERS);

  return (
    <main className="drone-edit">
      <header>
        <h1>
          {client.name} <small>({client.taxId})</small>
        </h1>
        <p>
          <ClientTypeBadge type={client.type} />
          {" · "}
          <Link href="/dashboard/clients">← Volver al listado</Link>
        </p>
      </header>

      {canWrite ? (
        <ClientForm mode="edit" client={client} />
      ) : (
        <section>
          <p>
            No tienes permisos para editar clientes (requiere rol{" "}
            <code>admin</code> u <code>operario</code>).
          </p>
          <dl>
            <dt>Nombre</dt>
            <dd>{client.name}</dd>
            <dt>CIF/NIF</dt>
            <dd>
              <code>{client.taxId}</code>
            </dd>
            <dt>Contacto</dt>
            <dd>{client.contactPerson ?? "—"}</dd>
            <dt>Email</dt>
            <dd>{client.contactEmail ?? "—"}</dd>
          </dl>
        </section>
      )}
    </main>
  );
}
