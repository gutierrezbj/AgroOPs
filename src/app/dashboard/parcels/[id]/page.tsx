/**
 * AgroOps — /dashboard/parcels/[id] (HU-07)
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, ROLES } from "@/lib/rbac";
import { listClients } from "@/features/clients/services";
import { ParcelForm } from "@/features/parcels/components/ParcelForm";
import { getParcel } from "@/features/parcels/services";

export const metadata = { title: "AgroOps — Parcela" };
export const dynamic = "force-dynamic";

interface EditParcelPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditParcelPage({ params }: EditParcelPageProps) {
  const { id } = await params;
  const [parcel, clients] = await Promise.all([getParcel(id), listClients()]);
  if (!parcel) notFound();

  const session = await auth();
  const canWrite = hasRole(session, ROLES.WRITERS);
  const clientName =
    clients.find((c) => c.id === parcel.clientId)?.name ?? parcel.clientId;

  return (
    <main className="drone-edit">
      <header>
        <h1>
          {parcel.name} <small>({parcel.sigpacReference})</small>
        </h1>
        <p>
          Cliente: <strong>{clientName}</strong>
          {" · "}
          Área: <strong>{parseFloat(parcel.areaHectares).toFixed(2)} ha</strong>
          {" · "}
          <Link href="/dashboard/parcels">← Volver al listado</Link>
        </p>
      </header>

      {canWrite ? (
        <ParcelForm
          mode="edit"
          parcel={parcel}
          clients={clients.map((c) => ({
            id: c.id,
            name: c.name,
            taxId: c.taxId,
          }))}
        />
      ) : (
        <section>
          <p>
            No tienes permisos para editar parcelas (requiere rol{" "}
            <code>admin</code> u <code>operario</code>).
          </p>
          <dl>
            <dt>Cliente</dt>
            <dd>{clientName}</dd>
            <dt>SIGPAC</dt>
            <dd>
              <code>{parcel.sigpacReference}</code>
            </dd>
            <dt>Área</dt>
            <dd>{parseFloat(parcel.areaHectares).toFixed(4)} ha</dd>
            <dt>Cultivo</dt>
            <dd>
              {parcel.crop ?? "—"}
              {parcel.cropVariety && ` (${parcel.cropVariety})`}
            </dd>
          </dl>
        </section>
      )}
    </main>
  );
}
