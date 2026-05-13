/**
 * AgroOps — /dashboard/parcels (HU-07 + HU-14)
 */
import Link from "next/link";
import { listClients } from "@/features/clients/services";
import { listParcels } from "@/features/parcels/services";
import { ParcelsTable } from "@/features/parcels/components/ParcelsTable";
import { EmptyState } from "@/features/shell/components/EmptyState";

export const metadata = { title: "AgroOps — Parcelas" };
export const dynamic = "force-dynamic";

export default async function ParcelsListPage() {
  const [parcels, clients] = await Promise.all([listParcels(), listClients()]);
  const clientNames: Record<string, string> = Object.fromEntries(
    clients.map((c) => [c.id, c.name]),
  );

  return (
    <main className="dashboard-listing">
      <header>
        <h1>Parcelas SIGPAC</h1>
        <p>
          Parcelas con geometría PostGIS (Polygon WGS84). Área autocalculada
          con <code>ST_Area::geography</code> al guardar. Acepta GeoJSON
          pegado o dibujo interactivo en MapLibre desde el formulario.
        </p>
        <p>
          <Link href="/dashboard/parcels/new" className="btn-primary">
            + Nueva parcela
          </Link>
          {" · "}
          <Link href="/dashboard">Volver al dashboard</Link>
        </p>
      </header>
      {parcels.length === 0 ? (
        <EmptyState
          icon="🗺"
          title="No hay parcelas registradas"
          description="Las parcelas son el recinto SIGPAC sobre el que vuelan tus misiones. Cada parcela pertenece a un cliente y se dibuja o pega como GeoJSON Polygon. Área se autocalcula con PostGIS."
          action={{
            href: "/dashboard/parcels/new",
            label: "Añadir primera parcela",
          }}
        />
      ) : (
        <ParcelsTable parcels={parcels} clientNames={clientNames} />
      )}
    </main>
  );
}
