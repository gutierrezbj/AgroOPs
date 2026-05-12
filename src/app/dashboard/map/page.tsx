/**
 * AgroOps — /dashboard/map (HU-14 Fase A)
 *
 * Vista global de mapa: parcelas SIGPAC del cliente seleccionado (o todos los
 * clientes) y NOTAMs activos ENAIRE. Server component que monta el MapView
 * cliente. Auth gate genérico (cualquier rol autenticado puede ver el mapa).
 *
 * Fase B (siguiente): dibujo interactivo de polígonos integrado en
 * `/dashboard/parcels/new`.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MapView } from "@/features/map/components/MapView";
import { listClients } from "@/features/clients/services";

export const metadata = { title: "Mapa" };
export const dynamic = "force-dynamic";

interface MapPageProps {
  searchParams: Promise<{ clientId?: string }>;
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?next=/dashboard/map");
  }

  const { clientId } = await searchParams;
  const clients = await listClients();

  return (
    <main className="map-page">
      <header className="map-page__header">
        <div>
          <h1>Mapa operativo</h1>
          <p className="map-page__subtitle">
            Parcelas SIGPAC y NOTAMs activos. Centrado automático en las
            parcelas cargadas; si no hay, centro España.
          </p>
        </div>
        <nav className="map-page__filters">
          <form method="get" className="map-page__filter-form">
            <label htmlFor="clientId">Filtrar por cliente</label>
            <select
              id="clientId"
              name="clientId"
              defaultValue={clientId ?? ""}
            >
              <option value="">Todos los clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="submit">Aplicar</button>
            {clientId && (
              <Link href="/dashboard/map" className="map-page__clear">
                Limpiar
              </Link>
            )}
          </form>
          <Link href="/dashboard" className="map-page__back">
            ← Dashboard
          </Link>
        </nav>
      </header>

      <section className="map-page__canvas">
        <MapView clientId={clientId} />
      </section>
    </main>
  );
}
