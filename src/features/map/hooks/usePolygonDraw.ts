"use client";

/**
 * AgroOps — usePolygonDraw (HU-14 Fase B)
 *
 * Hook puro de state machine para dibujo de polígonos sobre MapLibre. No
 * toca DOM ni eventos del mapa directamente; el componente cliente captura
 * el `onClick` del Map y llama `addVertex(lng, lat)`.
 *
 * Reglas:
 * - Mantiene `vertices: [lng, lat][]` en orden de inserción.
 * - `canClose` true cuando hay ≥3 vértices (mínimo para un polígono válido).
 * - `closeRing()` devuelve un `PolygonGeoJSON` cerrando el anillo (duplica
 *   el primer punto al final si no estaba cerrado ya). Devuelve `null` si
 *   no hay vértices suficientes (no lanza).
 * - `reset()` limpia.
 *
 * No persiste en localStorage — el state se pierde al desmontar. El consumer
 * decide qué hacer con el GeoJSON resultante (típicamente: poblar el
 * textarea del ParcelForm).
 */
import { useCallback, useMemo, useState } from "react";
import type { PolygonGeoJSON } from "@/features/parcels/schemas";

export type Vertex = [number, number]; // [lng, lat]

export interface UsePolygonDrawResult {
  vertices: Vertex[];
  count: number;
  canClose: boolean;
  addVertex: (lng: number, lat: number) => void;
  removeLastVertex: () => void;
  reset: () => void;
  /** GeoJSON Polygon con anillo cerrado. `null` si < 3 vértices. */
  closeRing: () => PolygonGeoJSON | null;
}

/**
 * Compara dos vértices con epsilon flotante (mismo punto si lat/lng difieren
 * en < 1e-9 grados ≈ 0.1 mm a la latitud de España).
 */
function sameVertex(a: Vertex, b: Vertex): boolean {
  return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
}

export function usePolygonDraw(): UsePolygonDrawResult {
  const [vertices, setVertices] = useState<Vertex[]>([]);

  const addVertex = useCallback((lng: number, lat: number) => {
    setVertices((prev) => [...prev, [lng, lat]]);
  }, []);

  const removeLastVertex = useCallback(() => {
    setVertices((prev) => (prev.length === 0 ? prev : prev.slice(0, -1)));
  }, []);

  const reset = useCallback(() => {
    setVertices([]);
  }, []);

  const closeRing = useCallback((): PolygonGeoJSON | null => {
    return buildClosedRing(vertices);
  }, [vertices]);

  return useMemo<UsePolygonDrawResult>(
    () => ({
      vertices,
      count: vertices.length,
      canClose: vertices.length >= 3,
      addVertex,
      removeLastVertex,
      reset,
      closeRing,
    }),
    [vertices, addVertex, removeLastVertex, reset, closeRing],
  );
}

/**
 * Helper exportado para tests puros sin React. Dado un array de vértices,
 * construye un `PolygonGeoJSON` válido o devuelve `null` si insuficientes.
 *
 * Cierra el anillo duplicando el primer punto al final si no estaba ya
 * cerrado (idempotente: si el último punto ya coincide con el primero, no
 * duplica de nuevo).
 */
export function buildClosedRing(vertices: Vertex[]): PolygonGeoJSON | null {
  if (vertices.length < 3) return null;
  const first = vertices[0]!;
  const last = vertices[vertices.length - 1]!;
  const closed: Vertex[] = sameVertex(first, last)
    ? [...vertices]
    : [...vertices, first];

  // Sanity: si el polígono degeneró (sólo 3 puntos y los 2 primeros iguales)
  // sigue siendo inválido para PostGIS. No verificamos área aquí — el server
  // recalcula con ST_Area y, si es 0, fallará. Aquí solo garantizamos shape.
  return {
    type: "Polygon",
    coordinates: [closed],
  };
}
