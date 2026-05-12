/**
 * AgroOps — /dashboard/parcels (HU-07)
 */
import Link from "next/link";
import { listClients } from "@/features/clients/services";
import { listParcels } from "@/features/parcels/services";
import { ParcelsTable } from "@/features/parcels/components/ParcelsTable";

export const metadata = { title: "AgroOps — Parcelas" };
export const dynamic = "force-dynamic";

export default async function ParcelsListPage() {
  const [parcels, clients] = await Promise.all([listParcels(), listClients()]);
  const clientNames: Record<string, string> = Object.fromEntries(
    clients.map((c) => [c.id, c.name]),
  );

  return (
    <main className="drones">
      <header>
        <h1>Parcelas SIGPAC</h1>
        <p>
          Parcelas con geometría PostGIS (Polygon WGS84). Área calculada
          automáticamente con PostGIS al guardar. En v1 se introduce GeoJSON
          pegado; el dibujo interactivo en MapLibre llega con HU-14.
        </p>
        <p>
          <Link href="/dashboard/parcels/new" className="btn-primary">
            + Nueva parcela
          </Link>
          {" · "}
          <Link href="/dashboard">Volver al dashboard</Link>
        </p>
      </header>
      <ParcelsTable parcels={parcels} clientNames={clientNames} />
    </main>
  );
}
