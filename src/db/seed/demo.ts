/**
 * AgroOps — seed DEMO (no productivo)
 *
 * Pobla el deployment con datos plausibles para enseñar el producto:
 * - 4 clientes (cooperativa, ATRIA, agricultor profesional, regantes)
 * - 4 parcelas SIGPAC con geometría PostGIS real (Andalucía/Valencia)
 * - 4 productos fitosanitarios (insecticida, herbicida, fungicida, ...)
 * - 5 misiones en distintos estados (draft, planned, approved, completed, invoiced)
 * - 2 albaranes firmados (completed + invoiced)
 *
 * Idempotente: usa `ON CONFLICT DO NOTHING` por taxId / sigpacReference /
 * lotNumber / mission.code. Se puede ejecutar varias veces sin duplicar.
 *
 * Uso:
 *   pnpm tsx src/db/seed/demo.ts
 *
 * NO ejecutar en producción real: las parcelas no son SIGPAC reales y los
 * productos son inventados con nombres comerciales conocidos para que
 * pinten bonito, no para auditoría PAC.
 */
/**
 * Cargar el env: usar `pnpm tsx --env-file=.env.local src/db/seed/demo.ts`
 * o `make db-seed-demo`. Los imports ES son hoisted antes de `dotenv.config()`,
 * por eso no podemos cargar el env en este archivo — debe inyectarse al runtime.
 */
import { eq, sql } from "drizzle-orm";
import { db } from "../index";
import { clients, type NewClient } from "../schema/clients";
import { parcels } from "../schema/parcels";
import {
  phytosanitaryProducts,
  type NewPhytosanitaryProduct,
} from "../schema/phytosanitary";
import {
  missions,
  type NewMission,
  type MissionStatus,
} from "../schema/missions";
import { missionParcels } from "../schema/mission-parcels";
import {
  missionPhyto,
  type NewMissionPhyto,
} from "../schema/mission-phyto";
import { albarans, type NewAlbaran } from "../schema/albarans";
import { drones } from "../schema/drones";
import { pilots } from "../schema/pilots";
import { NPTA_DROVINCI } from "../../lib/constants";

// 1x1 píxel transparente PNG en base64 — placeholder para firma de demo.
const FAKE_SIGNATURE_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4//8/AAX+Av7czFnnAAAAAElFTkSuQmCC";

// ─── Clientes ────────────────────────────────────────────────────────────

const DEMO_CLIENTS: NewClient[] = [
  {
    name: "Cooperativa La Solana",
    taxId: "F-22222222",
    type: "cooperativa",
    contactPerson: "María Ruiz",
    contactEmail: "tecnico@cooplasolana.es",
    contactPhone: "+34 957 100 100",
    billingAddress: "Avenida Andalucía 14",
    city: "Cabra",
    province: "Córdoba",
    postalCode: "14940",
    country: "ES",
    notes:
      "Cooperativa olivarera. 220 socios. Demanda principal: aplicación lambda-cihalotrín contra mosca del olivo julio-agosto.",
  },
  {
    name: "ATRIA Olivar Jaén",
    taxId: "G-33333333",
    type: "atria",
    contactPerson: "Antonio López",
    contactEmail: "atria@olivarjaen.es",
    contactPhone: "+34 953 200 200",
    billingAddress: "Calle Bernabé Soriano 8",
    city: "Jaén",
    province: "Jaén",
    postalCode: "23001",
    country: "ES",
    notes:
      "ATRIA con 38 socios productores. Asesoramiento técnico fitosanitario más aplicaciones puntuales con dron.",
  },
  {
    name: "Antonio Gómez (Almazara El Llano)",
    taxId: "44444444R",
    type: "agricultor",
    contactPerson: "Antonio Gómez",
    contactEmail: "antonio@almazaraelllano.com",
    contactPhone: "+34 600 444 444",
    billingAddress: "Cortijo El Llano s/n",
    city: "Villarrobledo",
    province: "Albacete",
    postalCode: "02600",
    country: "ES",
    notes: "Almendro Marcona + viña de tempranillo. Productor consolidado.",
  },
  {
    name: "Comunidad de Regantes del Genil",
    taxId: "G-55555555",
    type: "comunidad_regantes",
    contactPerson: "Lucía Martín",
    contactEmail: "secretaria@regantesgenil.es",
    contactPhone: "+34 958 300 300",
    billingAddress: "Calle del Río 1",
    city: "Loja",
    province: "Granada",
    postalCode: "18300",
    country: "ES",
    notes: "Cítricos en vega del Genil. ~190 ha de superficie regable.",
  },
];

async function seedDemoClients(): Promise<Record<string, string>> {
  await db
    .insert(clients)
    .values(DEMO_CLIENTS)
    .onConflictDoNothing({ target: clients.taxId });

  // Resolver los IDs (necesarios para FK)
  const allClients = await db.select().from(clients);
  const byTaxId: Record<string, string> = {};
  for (const c of allClients) byTaxId[c.taxId] = c.id;
  console.log(`  ✓ clients demo: ${DEMO_CLIENTS.length} ensured`);
  return byTaxId;
}

// ─── Parcelas (con geometría PostGIS) ────────────────────────────────────

interface DemoParcel {
  clientTaxId: string;
  sigpacReference: string;
  name: string;
  crop: string;
  cropVariety: string;
  /** Centro aproximado [lng, lat] para construir un polígono cuadrado. */
  center: [number, number];
  /** Lado del cuadrado en grados (aprox 0.003 ≈ 330m). */
  sideDeg: number;
}

const DEMO_PARCELS: DemoParcel[] = [
  {
    clientTaxId: "F-22222222",
    sigpacReference: "14-019-0-0-21-101-1",
    name: "El Pradillo (Cabra)",
    crop: "olivar",
    cropVariety: "Picual",
    center: [-4.443, 37.474],
    sideDeg: 0.004,
  },
  {
    clientTaxId: "G-33333333",
    sigpacReference: "23-050-0-0-12-205-1",
    name: "Olivar Grande",
    crop: "olivar",
    cropVariety: "Hojiblanca",
    center: [-3.789, 37.785],
    sideDeg: 0.0055,
  },
  {
    clientTaxId: "44444444R",
    sigpacReference: "02-079-0-0-08-345-1",
    name: "El Llano",
    crop: "almendro",
    cropVariety: "Marcona",
    center: [-2.601, 39.272],
    sideDeg: 0.005,
  },
  {
    clientTaxId: "G-55555555",
    sigpacReference: "18-126-0-0-04-088-1",
    name: "La Vega",
    crop: "cítricos",
    cropVariety: "Navelina",
    center: [-4.146, 37.171],
    sideDeg: 0.0035,
  },
];

function buildPolygon(center: [number, number], side: number): string {
  const [lng, lat] = center;
  const h = side / 2;
  // Anillo SW → SE → NE → NW → SW (cerrado)
  const ring: Array<[number, number]> = [
    [lng - h, lat - h],
    [lng + h, lat - h],
    [lng + h, lat + h],
    [lng - h, lat + h],
    [lng - h, lat - h],
  ];
  return JSON.stringify({ type: "Polygon", coordinates: [ring] });
}

async function seedDemoParcels(
  clientIdsByTaxId: Record<string, string>,
): Promise<Record<string, string>> {
  // SELECT-first idempotency: parcels.sigpac_reference no es UNIQUE en el
  // schema (es un index), por eso no podemos usar ON CONFLICT. Comprobamos
  // existencia por referencia antes de insertar.
  let inserted = 0;
  for (const p of DEMO_PARCELS) {
    const clientId = clientIdsByTaxId[p.clientTaxId];
    if (!clientId) {
      console.warn(`  ⚠ parcela ${p.name}: cliente ${p.clientTaxId} no encontrado`);
      continue;
    }
    const existing = await db.query.parcels.findFirst({
      where: eq(parcels.sigpacReference, p.sigpacReference),
    });
    if (existing) continue;

    const geojson = buildPolygon(p.center, p.sideDeg);
    await db.execute(sql`
      INSERT INTO parcels (
        client_id, sigpac_reference, name, geometry, area_hectares, crop, crop_variety
      )
      VALUES (
        ${clientId}::uuid,
        ${p.sigpacReference},
        ${p.name},
        ST_GeomFromGeoJSON(${geojson}),
        ST_Area(ST_GeomFromGeoJSON(${geojson})::geography) / 10000.0,
        ${p.crop},
        ${p.cropVariety}
      )
    `);
    inserted++;
  }
  const all = await db.select({ id: parcels.id, ref: parcels.sigpacReference }).from(parcels);
  const byRef: Record<string, string> = {};
  for (const row of all) byRef[row.ref] = row.id;
  console.log(
    `  ✓ parcels demo: ${inserted} insertados (${DEMO_PARCELS.length} totales en seed)`,
  );
  return byRef;
}

// ─── Fitosanitarios ──────────────────────────────────────────────────────

const DEMO_PHYTO: NewPhytosanitaryProduct[] = [
  {
    commercialName: "Karate Zeon 10 CS",
    activeIngredient: "Lambda-cihalotrín 10% [CS]",
    mapaRegistration: "23.111",
    formulation: "CS",
    lotNumber: "L-2026-KZ-A",
    expiresAt: "2027-12-31",
    recommendedDoseValue: "0.400",
    recommendedDoseUnit: "l_per_ha",
    notes: "Insecticida piretroide. Objetivo: mosca del olivo, prays. Demo seed — no usar en operación real.",
    active: true,
  },
  {
    commercialName: "Roundup Energy",
    activeIngredient: "Glifosato 45% [SL]",
    mapaRegistration: "21.870",
    formulation: "SL",
    lotNumber: "L-2026-RND-B",
    expiresAt: "2028-06-30",
    recommendedDoseValue: "4.000",
    recommendedDoseUnit: "l_per_ha",
    notes: "Herbicida sistémico. Objetivo: malas hierbas anuales y perennes. Demo seed.",
    active: true,
  },
  {
    commercialName: "Topas 10 EC",
    activeIngredient: "Penconazol 10% [EC]",
    mapaRegistration: "16.345",
    formulation: "EC",
    lotNumber: "L-2026-TPS-C",
    expiresAt: "2027-09-30",
    recommendedDoseValue: "0.500",
    recommendedDoseUnit: "l_per_ha",
    notes: "Fungicida triazólico. Objetivo: oídio, repilo del olivo. Demo seed.",
    active: true,
  },
  {
    commercialName: "Confidor 200 OD",
    activeIngredient: "Imidacloprid 20% [OD]",
    mapaRegistration: "22.987",
    formulation: "OD",
    lotNumber: "L-2026-CON-D",
    expiresAt: "2027-03-31",
    recommendedDoseValue: "0.300",
    recommendedDoseUnit: "l_per_ha",
    notes: "Insecticida sistémico. Objetivo: mosca blanca, pulgones. Demo seed.",
    active: true,
  },
];

async function seedDemoPhyto(): Promise<Record<string, string>> {
  let inserted = 0;
  for (const p of DEMO_PHYTO) {
    const existing = await db.query.phytosanitaryProducts.findFirst({
      where: eq(phytosanitaryProducts.lotNumber, p.lotNumber),
    });
    if (existing) continue;
    await db.insert(phytosanitaryProducts).values(p);
    inserted++;
  }
  const all = await db
    .select({ id: phytosanitaryProducts.id, lot: phytosanitaryProducts.lotNumber })
    .from(phytosanitaryProducts);
  const byLot: Record<string, string> = {};
  for (const row of all) byLot[row.lot] = row.id;
  console.log(
    `  ✓ phytosanitary demo: ${inserted} insertados (${DEMO_PHYTO.length} totales en seed)`,
  );
  return byLot;
}

// ─── Misiones ────────────────────────────────────────────────────────────

interface DemoMission {
  code: string;
  status: MissionStatus;
  clientTaxId: string;
  parcelRefs: string[];
  phytoLot: string;
  appliedDoseValue: string;
  doseUnit: "l_per_ha";
  scheduledOffsetDays: number;
  /** Si está, se popula startedAt/completedAt. */
  flightOffsetDays?: number;
  areaTreatedHa?: string;
  notes?: string;
}

const DEMO_MISSIONS: DemoMission[] = [
  {
    code: "AGM-2026-8001",
    status: "draft",
    clientTaxId: "F-22222222",
    parcelRefs: ["14-019-0-0-21-101-1"],
    phytoLot: "L-2026-KZ-A",
    appliedDoseValue: "0.400",
    doseUnit: "l_per_ha",
    scheduledOffsetDays: 7,
    notes: "Borrador — pendiente confirmar fecha con técnico cooperativa.",
  },
  {
    code: "AGM-2026-8002",
    status: "planned",
    clientTaxId: "G-33333333",
    parcelRefs: ["23-050-0-0-12-205-1"],
    phytoLot: "L-2026-TPS-C",
    appliedDoseValue: "0.500",
    doseUnit: "l_per_ha",
    scheduledOffsetDays: 4,
    notes: "Planificada — tratamiento preventivo repilo Hojiblanca.",
  },
  {
    code: "AGM-2026-8003",
    status: "approved",
    clientTaxId: "G-55555555",
    parcelRefs: ["18-126-0-0-04-088-1"],
    phytoLot: "L-2026-CON-D",
    appliedDoseValue: "0.300",
    doseUnit: "l_per_ha",
    scheduledOffsetDays: 2,
    notes: "Aprobada por dirección. Pendiente entrar en preflight.",
  },
  {
    code: "AGM-2026-8004",
    status: "completed",
    clientTaxId: "44444444R",
    parcelRefs: ["02-079-0-0-08-345-1"],
    phytoLot: "L-2026-RND-B",
    appliedDoseValue: "4.000",
    doseUnit: "l_per_ha",
    scheduledOffsetDays: -5,
    flightOffsetDays: -5,
    areaTreatedHa: "24.5000",
    notes:
      "Aplicación completada — herbicida pre-emergencia en almendro. Pendiente facturar (modo manual).",
  },
  {
    code: "AGM-2026-8005",
    status: "invoiced",
    clientTaxId: "F-22222222",
    parcelRefs: ["14-019-0-0-21-101-1"],
    phytoLot: "L-2026-KZ-A",
    appliedDoseValue: "0.400",
    doseUnit: "l_per_ha",
    scheduledOffsetDays: -14,
    flightOffsetDays: -14,
    areaTreatedHa: "16.2000",
    notes:
      "Misión histórica completada y facturada. Aparece en cuaderno de campo PAC.",
  },
];

function offsetDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function seedDemoMissions(
  clientIdsByTaxId: Record<string, string>,
  parcelIdsByRef: Record<string, string>,
  phytoIdsByLot: Record<string, string>,
): Promise<void> {
  // Necesitamos un drone aplicador + piloto del seed AgroM
  const drone = await db.query.drones.findFirst({
    where: eq(drones.applicationCapable, true),
  });
  const pilot = await db.query.pilots.findFirst();
  if (!drone || !pilot) {
    console.warn("  ⚠ seed AgroM (drones/pilots) requerido antes del demo. Skip misiones.");
    return;
  }

  for (const m of DEMO_MISSIONS) {
    const clientId = clientIdsByTaxId[m.clientTaxId];
    if (!clientId) continue;

    const phytoId = phytoIdsByLot[m.phytoLot];
    if (!phytoId) continue;

    const parcelIds = m.parcelRefs
      .map((r) => parcelIdsByRef[r])
      .filter((v): v is string => Boolean(v));
    if (parcelIds.length === 0) continue;

    // Decidir si la misión necesita pilot/drone según estado.
    // En draft podemos dejarlos null para que se vea ese state.
    const needsResources =
      m.status !== "draft" || m.parcelRefs.length === 0; // siempre asigna para visibilidad
    const droneId = m.status === "draft" ? null : drone.id;
    const pilotId = m.status === "draft" ? null : pilot.id;

    const completedAt = m.flightOffsetDays != null
      ? offsetDate(m.flightOffsetDays)
      : null;
    const startedAt = completedAt
      ? new Date(completedAt.getTime() - 60 * 60 * 1000) // 1h antes
      : null;

    // weatherSnapshot mock para missions a partir de approved
    const weatherSnapshot =
      m.status === "approved" ||
      m.status === "preflight" ||
      m.status === "in_flight" ||
      m.status === "completed" ||
      m.status === "invoiced"
        ? {
            capturedAt: (startedAt ?? offsetDate(0)).toISOString(),
            stationId: "ES-DEMO",
            windSpeedMs: 2.4,
            windDirectionDeg: 270,
            precipitationMm: 0,
            temperatureC: 18.5,
            humidityPct: 64,
            flightSuitable: true,
            raw: { stub: true, demo: true },
          }
        : null;

    // telemetry mock para completed/invoiced
    const telemetry =
      m.status === "completed" || m.status === "invoiced"
        ? {
            ...(startedAt ? { startedAt: startedAt.toISOString() } : {}),
            ...(completedAt
              ? { finishedAt: completedAt.toISOString() }
              : {}),
            ...(startedAt && completedAt
              ? {
                  durationSeconds: Math.round(
                    (completedAt.getTime() - startedAt.getTime()) / 1000,
                  ),
                }
              : {}),
            raw: { stub: true, demo: true, manual: true },
          }
        : null;

    const row: NewMission = {
      code: m.code,
      type: "aerial_application",
      status: m.status,
      clientId,
      pilotId,
      droneId,
      nptaReference: NPTA_DROVINCI,
      scheduledAt: offsetDate(m.scheduledOffsetDays),
      startedAt,
      completedAt,
      areaPlannedHa: null,
      areaTreatedHa: m.areaTreatedHa ?? null,
      weatherSnapshot,
      telemetry,
      notes: m.notes ?? null,
    };

    const [inserted] = await db
      .insert(missions)
      .values(row)
      .onConflictDoNothing({ target: missions.code })
      .returning();

    if (!inserted) continue; // ya existía

    // M:M parcels
    await db.insert(missionParcels).values(
      parcelIds.map((pid) => ({
        missionId: inserted.id,
        parcelId: pid,
        areaTreatedHa: m.areaTreatedHa ?? null,
      })),
    );

    // M:M phyto (1 producto por misión en el demo)
    const phytoRow: NewMissionPhyto = {
      missionId: inserted.id,
      productId: phytoId,
      lotUsed: m.phytoLot,
      appliedDoseValue: m.appliedDoseValue,
      appliedDoseUnit: m.doseUnit,
      totalAmountUsed: m.areaTreatedHa
        ? (
            parseFloat(m.appliedDoseValue) * parseFloat(m.areaTreatedHa)
          ).toFixed(3)
        : null,
      totalAmountUnit: m.areaTreatedHa ? "L" : null,
      areaCoveredHa: m.areaTreatedHa ?? null,
    };
    await db.insert(missionPhyto).values(phytoRow);
  }

  console.log(`  ✓ missions demo: ${DEMO_MISSIONS.length} ensured`);
}

// ─── Albaranes (sólo para completed/invoiced) ────────────────────────────

async function seedDemoAlbarans(): Promise<void> {
  const candidates = await db.query.missions.findMany({
    where: (m, { inArray }) =>
      inArray(m.status, ["completed", "invoiced"]),
  });
  let count = 0;
  for (const mission of candidates) {
    const code = mission.code.replace("AGM-", "ALB-");
    const signedAt = mission.completedAt
      ? new Date(mission.completedAt.getTime() + 30 * 60 * 1000)
      : new Date();
    const row: NewAlbaran = {
      missionId: mission.id,
      code,
      signedAt,
      signerFullName:
        mission.status === "invoiced"
          ? "María Ruiz (técnico Cooperativa)"
          : "Antonio Gómez (titular finca)",
      signerNif:
        mission.status === "invoiced" ? "44444444R" : "12345678Z",
      signatureImageBase64: FAKE_SIGNATURE_PNG,
      pdfPath: null,
      pdfHash: null,
      notes: "Albarán demo — firma placeholder.",
    };
    const [inserted] = await db
      .insert(albarans)
      .values(row)
      .onConflictDoNothing({ target: albarans.missionId })
      .returning();
    if (inserted) count++;
  }
  console.log(`  ✓ albarans demo: ${count} firmados ensured`);
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log("AgroOps — seed DEMO (escaparate del producto)");
  console.log("─────────────────────────────────────────────");
  const clientIds = await seedDemoClients();
  const parcelIds = await seedDemoParcels(clientIds);
  const phytoIds = await seedDemoPhyto();
  await seedDemoMissions(clientIds, parcelIds, phytoIds);
  await seedDemoAlbarans();
  console.log("─────────────────────────────────────────────");
  console.log("✓ Demo cargada. Recarga el navegador.");
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Seed demo falló:", err);
  process.exit(1);
});
