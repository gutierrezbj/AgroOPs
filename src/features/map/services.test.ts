/**
 * AgroOps — features/map/services tests
 */
import { describe, expect, it } from "vitest";
import type { FeatureCollection, Polygon } from "geojson";
import type { ParcelWithGeoJSON } from "@/features/parcels/services";
import {
  bboxFromFeatureCollection,
  parcelsToFeatureCollection,
  SPAIN_DEFAULT_CENTER,
  SPAIN_DEFAULT_ZOOM,
} from "./services";

const baseParcel: ParcelWithGeoJSON = {
  id: "00000000-0000-0000-0000-000000000001",
  clientId: "00000000-0000-0000-0000-000000000aaa",
  sigpacReference: "28-079-0-0-12-345-1",
  name: "El Pradillo",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-3.7, 40.4],
        [-3.69, 40.4],
        [-3.69, 40.41],
        [-3.7, 40.41],
        [-3.7, 40.4],
      ],
    ],
  },
  areaHectares: "12.3456",
  crop: "trigo",
  cropVariety: "Marius",
  notes: null,
  createdAt: new Date("2026-05-12T10:00:00Z"),
  updatedAt: new Date("2026-05-12T10:00:00Z"),
};

describe("parcelsToFeatureCollection", () => {
  it("transforma parcelas en FeatureCollection con properties tipadas", () => {
    const fc = parcelsToFeatureCollection([baseParcel]);

    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features).toHaveLength(1);

    const [feat] = fc.features;
    expect(feat?.type).toBe("Feature");
    expect(feat?.geometry.type).toBe("Polygon");
    expect(feat?.geometry.coordinates).toEqual(baseParcel.geometry.coordinates);
    expect(feat?.properties).toEqual({
      id: baseParcel.id,
      name: "El Pradillo",
      clientId: baseParcel.clientId,
      sigpacReference: "28-079-0-0-12-345-1",
      crop: "trigo",
      cropVariety: "Marius",
      areaHectares: 12.3456,
    });
  });

  it("parsea areaHectares de string a number", () => {
    const fc = parcelsToFeatureCollection([
      { ...baseParcel, areaHectares: "0.5000" },
      { ...baseParcel, id: "second", areaHectares: "1234.5678" },
    ]);
    expect(fc.features[0]?.properties.areaHectares).toBe(0.5);
    expect(fc.features[1]?.properties.areaHectares).toBe(1234.5678);
  });

  it("devuelve FeatureCollection vacía si no hay parcelas", () => {
    const fc = parcelsToFeatureCollection([]);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features).toEqual([]);
  });

  it("descarta parcelas con geometría inválida defensivamente", () => {
    // Forzamos shape inválido (Point en vez de Polygon) para verificar el
    // filtro defensivo. En runtime real esto no llega porque el schema Zod
    // lo bloquea, pero el guard de services protege contra payloads corruptos
    // (p.ej. parcela importada manualmente con SQL).
    const broken = {
      ...baseParcel,
      id: "broken",
      geometry: { type: "Point", coordinates: [-3.7, 40.4] },
    } as unknown as ParcelWithGeoJSON;
    const fc = parcelsToFeatureCollection([baseParcel, broken]);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0]?.properties.id).toBe(baseParcel.id);
  });
});

describe("bboxFromFeatureCollection", () => {
  it("calcula bbox sobre un polígono único", () => {
    const fc = parcelsToFeatureCollection([baseParcel]);
    const bbox = bboxFromFeatureCollection(fc);
    expect(bbox).toEqual([-3.7, 40.4, -3.69, 40.41]);
  });

  it("calcula bbox uniendo múltiples polígonos", () => {
    const fc: FeatureCollection<Polygon> = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-3.7, 40.4],
                [-3.69, 40.4],
                [-3.69, 40.41],
                [-3.7, 40.41],
                [-3.7, 40.4],
              ],
            ],
          },
        },
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-2.0, 41.0],
                [-1.9, 41.0],
                [-1.9, 41.1],
                [-2.0, 41.1],
                [-2.0, 41.0],
              ],
            ],
          },
        },
      ],
    };
    expect(bboxFromFeatureCollection(fc)).toEqual([-3.7, 40.4, -1.9, 41.1]);
  });

  it("devuelve null si la colección está vacía", () => {
    const fc: FeatureCollection<Polygon> = {
      type: "FeatureCollection",
      features: [],
    };
    expect(bboxFromFeatureCollection(fc)).toBeNull();
  });
});

describe("constantes de fallback", () => {
  it("SPAIN_DEFAULT_CENTER apunta al centro de la península", () => {
    const [lng, lat] = SPAIN_DEFAULT_CENTER;
    // Madrid aprox -3.7, 40.4
    expect(lng).toBeGreaterThan(-4);
    expect(lng).toBeLessThan(-3);
    expect(lat).toBeGreaterThan(40);
    expect(lat).toBeLessThan(41);
  });

  it("SPAIN_DEFAULT_ZOOM da nivel país", () => {
    expect(SPAIN_DEFAULT_ZOOM).toBeGreaterThan(4);
    expect(SPAIN_DEFAULT_ZOOM).toBeLessThan(7);
  });
});
