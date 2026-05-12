/**
 * AgroOps — /api/parcels/geojson (HU-14 Fase A)
 *
 * Devuelve todas las parcelas como `FeatureCollection<Polygon>` consumible
 * por MapLibre. Auth gate: cualquier rol autenticado (admin, piloto, operario,
 * viewer) puede ver el mapa. Filtros opcionales por `clientId` query param.
 *
 * No usamos paginación en v1: el número de parcelas por deployment se espera
 * < 1.000. Si supera, en v1.1 añadiremos `?bbox=minLng,minLat,maxLng,maxLat`
 * y filtraremos server-side con ST_Intersects.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listParcels } from "@/features/parcels/services";
import { parcelsToFeatureCollection } from "@/features/map/services";

export const dynamic = "force-dynamic"; // depende de auth + DB live

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId") ?? undefined;

  const parcels = await listParcels(clientId ? { clientId } : {});
  const fc = parcelsToFeatureCollection(parcels);

  return NextResponse.json(fc, {
    headers: {
      "Cache-Control": "private, no-cache",
    },
  });
}
