/**
 * AgroOps — /api/notams/geojson (HU-14 Fase A)
 *
 * Proxy de `fetchActiveNotams()` (HU-12). El payload ya es un
 * `NotamCollection` (FeatureCollection con metadata `source` indicando si
 * viene live / cache / stub). El cliente MapLibre lo consume directamente.
 *
 * Auth gate: cualquier rol autenticado.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchActiveNotams } from "@/server/integrations/enaire";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const collection = await fetchActiveNotams();

  return NextResponse.json(collection, {
    headers: {
      // Redis cachea 15min; aquí no añadimos cache HTTP para que el indicador
      // de `source` se refresque cada vez (live/cache/stub).
      "Cache-Control": "private, no-cache",
    },
  });
}
