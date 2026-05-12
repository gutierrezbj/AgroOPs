/**
 * AgroOps — usePolygonDraw tests
 *
 * Solo testeamos la función pura `buildClosedRing` (lógica núcleo). El
 * hook envolvente `usePolygonDraw` es un wrapper trivial de `useState`
 * alrededor de `buildClosedRing`; no merece un test con renderHook +
 * jsdom porque añadiría 2 deps de devDependencies para cubrir setters
 * que ya viene cubiertos por React.
 */
import { describe, expect, it } from "vitest";
import { buildClosedRing, type Vertex } from "./usePolygonDraw";

describe("buildClosedRing", () => {
  it("devuelve null si hay menos de 3 vértices", () => {
    expect(buildClosedRing([])).toBeNull();
    expect(buildClosedRing([[-3.7, 40.4]])).toBeNull();
    expect(
      buildClosedRing([
        [-3.7, 40.4],
        [-3.6, 40.4],
      ]),
    ).toBeNull();
  });

  it("cierra el anillo si el último vértice difiere del primero", () => {
    const result = buildClosedRing([
      [-3.7, 40.4],
      [-3.6, 40.4],
      [-3.6, 40.5],
    ]);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("Polygon");
    expect(result?.coordinates[0]).toEqual([
      [-3.7, 40.4],
      [-3.6, 40.4],
      [-3.6, 40.5],
      [-3.7, 40.4],
    ]);
  });

  it("no duplica el cierre si el último vértice ya coincide con el primero", () => {
    const result = buildClosedRing([
      [-3.7, 40.4],
      [-3.6, 40.4],
      [-3.6, 40.5],
      [-3.7, 40.4],
    ]);
    expect(result?.coordinates[0]).toHaveLength(4);
    expect(result?.coordinates[0]?.[0]).toEqual([-3.7, 40.4]);
    expect(result?.coordinates[0]?.[3]).toEqual([-3.7, 40.4]);
  });

  it("considera 'mismo punto' con epsilon < 1e-9 (ruido IEEE 754)", () => {
    const v0: Vertex = [-3.7, 40.4];
    const v1: Vertex = [-3.6, 40.4];
    const v2: Vertex = [-3.6, 40.5];
    const v0Approx: Vertex = [-3.7 + 1e-12, 40.4 + 1e-12];
    const result = buildClosedRing([v0, v1, v2, v0Approx]);
    expect(result?.coordinates[0]).toHaveLength(4);
  });

  it("permite polígonos con muchos vértices", () => {
    // Hexágono aproximado en torno a Madrid
    const center: Vertex = [-3.7, 40.4];
    const radius = 0.01;
    const vertices: Vertex[] = Array.from({ length: 6 }, (_, i) => {
      const angle = (i * Math.PI) / 3;
      return [
        center[0] + radius * Math.cos(angle),
        center[1] + radius * Math.sin(angle),
      ];
    });
    const result = buildClosedRing(vertices);
    expect(result?.coordinates[0]).toHaveLength(7); // 6 + cierre
  });
});
