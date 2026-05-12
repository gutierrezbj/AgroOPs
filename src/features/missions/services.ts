/**
 * AgroOps — missions services (HU-09 + HU-10)
 *
 * - listMissions / getMission con joins de cliente, dron, piloto.
 * - createMission con código autogenerado (HU-11) en transaction.
 * - setMissionParcels: replace M:M en `mission_parcels`, valida que las
 *   parcelas pertenezcan al cliente de la misión.
 * - transitionMission: valida gate (HU-10), aplica side-effects (startedAt
 *   en in_flight, completedAt en completed), persiste status.
 *
 * El audit log se hace en las Server Actions, no aquí.
 */
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { albarans } from "@/db/schema/albarans";
import { clients, type Client } from "@/db/schema/clients";
import { drones, type Drone } from "@/db/schema/drones";
import { missionParcels } from "@/db/schema/mission-parcels";
import {
  missions,
  type Mission,
  type MissionStatus,
  type NewMission,
} from "@/db/schema/missions";
import { parcels, type Parcel } from "@/db/schema/parcels";
import { pilots, type Pilot } from "@/db/schema/pilots";
import { nextMissionCode } from "@/lib/mission-codes";
import { NPTA_DROVINCI } from "@/lib/constants";
import { captureWeatherForCoordinates } from "@/server/integrations/aemet";
import {
  createInvoiceForMission,
  getInvoiceForMission,
  InvoicingError,
} from "@/features/invoicing/services";
import { HoldedError } from "@/server/integrations/holded";
import type {
  CompleteMissionInput,
  CreateMissionInput,
  ListMissionFilters,
  UpdateMissionInput,
} from "./schemas";
import {
  type GateContext,
  type GateResult,
  canTransition,
  evaluateGate,
} from "./state-machine";

/**
 * Mission con datos derivados para la UI (sin tener que hacer joins en cada
 * componente). `parcels` se popula bajo demanda en `getMission`.
 */
export interface MissionListItem extends Mission {
  clientName: string;
  pilotName: string | null;
  droneModel: string | null;
  parcelCount: number;
  parcelsArea: string | null; // suma de areaHectares de parcels asociadas
}

export interface MissionDetail extends Mission {
  client: Client;
  drone: Drone | null;
  pilot: Pilot | null;
  parcels: Array<{ parcel: Parcel; areaTreatedHa: string | null }>;
}

function toDateOrNull(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function listMissions(
  filters: ListMissionFilters = {},
): Promise<MissionListItem[]> {
  const conditions = [];
  if (filters.status) conditions.push(eq(missions.status, filters.status));
  if (filters.clientId)
    conditions.push(eq(missions.clientId, filters.clientId));
  if (filters.pilotId)
    conditions.push(eq(missions.pilotId, filters.pilotId));
  if (filters.droneId)
    conditions.push(eq(missions.droneId, filters.droneId));

  const rows = await db
    .select({
      // missions.*
      id: missions.id,
      code: missions.code,
      type: missions.type,
      status: missions.status,
      clientId: missions.clientId,
      pilotId: missions.pilotId,
      droneId: missions.droneId,
      nptaReference: missions.nptaReference,
      scheduledAt: missions.scheduledAt,
      startedAt: missions.startedAt,
      completedAt: missions.completedAt,
      areaPlannedHa: missions.areaPlannedHa,
      areaTreatedHa: missions.areaTreatedHa,
      weatherSnapshot: missions.weatherSnapshot,
      telemetry: missions.telemetry,
      notes: missions.notes,
      createdAt: missions.createdAt,
      updatedAt: missions.updatedAt,
      // joins
      clientName: clients.name,
      pilotName: pilots.fullName,
      droneModel: drones.model,
    })
    .from(missions)
    .leftJoin(clients, eq(missions.clientId, clients.id))
    .leftJoin(pilots, eq(missions.pilotId, pilots.id))
    .leftJoin(drones, eq(missions.droneId, drones.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(missions.scheduledAt), desc(missions.createdAt));

  // Cargar conteos + sumas de áreas en una sola query con groupBy
  const ids = rows.map((r) => r.id);
  const parcelsAgg =
    ids.length > 0
      ? await db
          .select({
            missionId: missionParcels.missionId,
            parcelCount: sql<number>`count(*)::int`,
            // Suma del área TOTAL de las parcelas (no del area_treated_ha del join)
            parcelsArea: sql<string>`COALESCE(SUM(${parcels.areaHectares})::text, '0')`,
          })
          .from(missionParcels)
          .leftJoin(parcels, eq(missionParcels.parcelId, parcels.id))
          .where(inArray(missionParcels.missionId, ids))
          .groupBy(missionParcels.missionId)
      : [];

  const aggByMission = new Map(
    parcelsAgg.map((p) => [p.missionId, p]),
  );

  return rows.map((r) => ({
    ...r,
    clientName: r.clientName ?? "—",
    pilotName: r.pilotName ?? null,
    droneModel: r.droneModel ?? null,
    parcelCount: aggByMission.get(r.id)?.parcelCount ?? 0,
    parcelsArea: aggByMission.get(r.id)?.parcelsArea ?? null,
  }));
}

export async function getMission(id: string): Promise<MissionDetail | null> {
  const mission = await db.query.missions.findFirst({
    where: eq(missions.id, id),
  });
  if (!mission) return null;

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, mission.clientId))
    .limit(1);
  if (!client) {
    throw new Error(
      `getMission: cliente ${mission.clientId} no encontrado (FK violada)`,
    );
  }

  const drone = mission.droneId
    ? ((
        await db.select().from(drones).where(eq(drones.id, mission.droneId)).limit(1)
      )[0] ?? null)
    : null;

  const pilot = mission.pilotId
    ? ((
        await db.select().from(pilots).where(eq(pilots.id, mission.pilotId)).limit(1)
      )[0] ?? null)
    : null;

  const parcelRows = await db
    .select({
      parcel: parcels,
      areaTreatedHa: missionParcels.areaTreatedHa,
    })
    .from(missionParcels)
    .leftJoin(parcels, eq(missionParcels.parcelId, parcels.id))
    .where(eq(missionParcels.missionId, id))
    .orderBy(asc(parcels.name));

  return {
    ...mission,
    client,
    drone,
    pilot,
    parcels: parcelRows
      .filter((r): r is { parcel: Parcel; areaTreatedHa: string | null } => r.parcel != null)
      .map((r) => ({ parcel: r.parcel, areaTreatedHa: r.areaTreatedHa })),
  };
}

export async function createMission(
  input: CreateMissionInput,
): Promise<Mission> {
  const code = await nextMissionCode();

  const values: NewMission = {
    code,
    type: "aerial_application",
    status: "draft",
    clientId: input.clientId,
    droneId: input.droneId ?? null,
    pilotId: input.pilotId ?? null,
    nptaReference: NPTA_DROVINCI,
    scheduledAt: toDateOrNull(input.scheduledAt),
    notes: input.notes ?? null,
  };

  const [created] = await db.insert(missions).values(values).returning();
  if (!created) {
    throw new Error("createMission: inserción no devolvió fila");
  }
  return created;
}

export async function updateMission(
  id: string,
  input: UpdateMissionInput,
): Promise<Mission | null> {
  const values: Partial<NewMission> = {};
  if (input.clientId !== undefined) values.clientId = input.clientId;
  if (input.droneId !== undefined) values.droneId = input.droneId;
  if (input.pilotId !== undefined) values.pilotId = input.pilotId;
  if (input.scheduledAt !== undefined) {
    values.scheduledAt = toDateOrNull(input.scheduledAt);
  }
  if (input.notes !== undefined) values.notes = input.notes;

  if (Object.keys(values).length === 0) {
    const existing = await db.query.missions.findFirst({
      where: eq(missions.id, id),
    });
    return existing ?? null;
  }

  const [updated] = await db
    .update(missions)
    .set(values)
    .where(eq(missions.id, id))
    .returning();
  return updated ?? null;
}

/**
 * Reemplaza las parcelas asignadas a una misión. Valida que todas las parcelas
 * pertenezcan al cliente de la misión (no permitimos misiones cross-cliente).
 */
export async function setMissionParcels(
  missionId: string,
  parcelIds: string[],
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const mission = await db.query.missions.findFirst({
    where: eq(missions.id, missionId),
  });
  if (!mission) return { ok: false, error: "Misión no encontrada" };

  // Validar que cada parcela pertenece al cliente de la misión
  const validParcels = await db
    .select({ id: parcels.id })
    .from(parcels)
    .where(
      and(
        inArray(parcels.id, parcelIds),
        eq(parcels.clientId, mission.clientId),
      ),
    );

  if (validParcels.length !== parcelIds.length) {
    return {
      ok: false,
      error: `${parcelIds.length - validParcels.length} parcela(s) no pertenecen al cliente de la misión`,
    };
  }

  // Reemplaza M:M: borra y reinserta. Sin transaction explícita por simpleza;
  // si falla el insert, el delete queda hecho — el operador puede reintentar.
  await db.delete(missionParcels).where(eq(missionParcels.missionId, missionId));
  if (parcelIds.length > 0) {
    await db.insert(missionParcels).values(
      parcelIds.map((parcelId) => ({
        missionId,
        parcelId,
        areaTreatedHa: null,
      })),
    );
  }

  return { ok: true, count: parcelIds.length };
}

/**
 * Devuelve el centroide (lat/lng) de la primera parcela de la misión usando
 * PostGIS `ST_Centroid`. Lo usa `transitionMission` para llamar a AEMET con
 * coordenadas reales en `approved → preflight`. Sin parcelas → null.
 */
export async function getMissionPrimaryCentroid(
  missionId: string,
): Promise<{ lat: number; lng: number } | null> {
  const result = await db.execute<{ lat: string; lng: string }>(sql`
    SELECT
      ST_Y(ST_Centroid(p.geometry))::text AS lat,
      ST_X(ST_Centroid(p.geometry))::text AS lng
    FROM mission_parcels mp
    JOIN parcels p ON p.id = mp.parcel_id
    WHERE mp.mission_id = ${missionId}::uuid
    ORDER BY p.name ASC
    LIMIT 1
  `);
  const row = result.rows[0];
  if (!row) return null;
  return {
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lng),
  };
}

/**
 * Aplica una transición de estado. Construye el `GateContext` cargando
 * el dron, piloto y conteo de parcels asociado. Si el gate falla, devuelve
 * los errores sin tocar la BD. Si pasa, persiste el cambio y aplica
 * side-effects (startedAt, completedAt).
 *
 * Side-effect HU-13: en `approved → preflight`, si la misión aún no tiene
 * `weatherSnapshot`, intenta capturar uno automáticamente desde AEMET usando
 * el centroide de la primera parcela (o Madrid centro como fallback). El
 * snapshot se persiste ANTES de evaluar el gate, así éste puede decidir
 * con datos reales si `flightSuitable=false` bloquea.
 */
export async function transitionMission(
  id: string,
  targetStatus: MissionStatus,
): Promise<
  | { ok: true; mission: Mission; gate: GateResult }
  | { ok: false; error: string; gate?: GateResult }
> {
  let mission = await db.query.missions.findFirst({
    where: eq(missions.id, id),
  });
  if (!mission) return { ok: false, error: "Misión no encontrada" };

  const from = mission.status;
  if (!canTransition(from, targetStatus)) {
    return {
      ok: false,
      error: `Transición ${from} → ${targetStatus} no permitida`,
    };
  }

  // ─── HU-13: captura automática de meteo en approved → preflight ──────
  if (
    from === "approved" &&
    targetStatus === "preflight" &&
    !mission.weatherSnapshot
  ) {
    const centroid = await getMissionPrimaryCentroid(id);
    const coords = centroid ?? { lat: 40.4168, lng: -3.7038 }; // fallback Madrid
    try {
      const snapshot = await captureWeatherForCoordinates(
        coords.lat,
        coords.lng,
      );
      const [refreshed] = await db
        .update(missions)
        .set({ weatherSnapshot: snapshot })
        .where(eq(missions.id, id))
        .returning();
      if (refreshed) mission = refreshed;
    } catch (err) {
      console.warn("[transitionMission] captura meteo falló:", err);
      // No bloqueamos: el gate decidirá con snapshot=null (warning soft).
    }
  }

  // ─── HU-19: disparo automático de factura en completed → invoiced ─────
  // Patrón idéntico a HU-13: side-effect ANTES del gate, así éste decide
  // con datos reales (existencia de invoice_ref) si bloquea o no.
  //
  // Si ya hay invoice issued, no duplicamos. Si no, intentamos crear.
  // Si Holded falla, persistimos invoice_ref con status=error y NO
  // transitamos (el gate falla porque no hay invoice issued).
  if (from === "completed" && targetStatus === "invoiced") {
    const existing = await getInvoiceForMission(id);
    if (!existing || existing.status !== "issued") {
      try {
        await createInvoiceForMission(id);
      } catch (err) {
        if (err instanceof InvoicingError) {
          // Prerequisito faltante (sin albarán, sin precio, etc.) — el gate lo recogerá
          console.warn(
            `[transitionMission] factura no disparada (${err.kind}):`,
            err.message,
          );
        } else if (err instanceof HoldedError) {
          // Fallo Holded — invoice_ref ya quedó con status=error. El gate falla.
          console.warn(
            `[transitionMission] Holded rechazó factura (${err.kind}):`,
            err.message,
          );
        } else {
          console.warn("[transitionMission] error inesperado al facturar:", err);
        }
      }
    }
  }

  // Cargar contexto para el gate
  const drone = mission.droneId
    ? ((await db.select().from(drones).where(eq(drones.id, mission.droneId)).limit(1))[0] ?? null)
    : null;
  const pilot = mission.pilotId
    ? ((await db.select().from(pilots).where(eq(pilots.id, mission.pilotId)).limit(1))[0] ?? null)
    : null;
  const parcelCountResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(missionParcels)
    .where(eq(missionParcels.missionId, id));
  const parcelCount = parcelCountResult[0]?.count ?? 0;

  // HU-19: contexto extra para gate completed → invoiced
  let albaranSigned: boolean | undefined;
  let invoiceStatus: GateContext["invoiceStatus"];
  let clientHoldedSynced: boolean | undefined;
  if (from === "completed" && targetStatus === "invoiced") {
    const [albaranRow] = await db
      .select({ signedAt: albarans.signedAt })
      .from(albarans)
      .where(eq(albarans.missionId, id))
      .limit(1);
    albaranSigned = Boolean(albaranRow?.signedAt);

    const [clientRow] = await db
      .select({ holdedContactId: clients.holdedContactId })
      .from(clients)
      .where(eq(clients.id, mission.clientId))
      .limit(1);
    clientHoldedSynced = Boolean(clientRow?.holdedContactId);

    const invoice = await getInvoiceForMission(id);
    invoiceStatus = invoice?.status ?? null;
  }

  const ctx: GateContext = {
    mission,
    drone,
    pilot,
    parcelCount,
    albaranSigned,
    invoiceStatus,
    clientHoldedSynced,
  };
  const gate = evaluateGate(from, targetStatus, ctx);
  if (!gate.ok) {
    return { ok: false, error: gate.errors.join(" · "), gate };
  }

  // Side-effects por transición
  const setValues: Partial<NewMission> = { status: targetStatus };
  if (targetStatus === "in_flight" && !mission.startedAt) {
    setValues.startedAt = new Date();
  }
  if (targetStatus === "completed" && !mission.completedAt) {
    setValues.completedAt = new Date();
  }

  const [updated] = await db
    .update(missions)
    .set(setValues)
    .where(eq(missions.id, id))
    .returning();

  if (!updated) {
    return { ok: false, error: "No se pudo persistir el cambio de estado" };
  }

  return { ok: true, mission: updated, gate };
}

/**
 * Variante de transitionMission para cierre con área tratada explícita.
 * Antes de transitar a `completed`, persiste areaTreatedHa y un stub mínimo
 * de telemetry para que el gate pase (en v1, HU-14 traerá telemetría real).
 */
export async function completeMissionManually(
  id: string,
  userId: string,
  input: CompleteMissionInput,
): Promise<
  | { ok: true; mission: Mission; gate: GateResult }
  | { ok: false; error: string; gate?: GateResult }
> {
  const existing = await db.query.missions.findFirst({
    where: eq(missions.id, id),
  });
  if (!existing) return { ok: false, error: "Misión no encontrada" };
  if (existing.status !== "in_flight") {
    return {
      ok: false,
      error: `Sólo se puede completar desde in_flight (actual: ${existing.status})`,
    };
  }

  // Persistir area + telemetry mínima ANTES de transitar. Como el tipo
  // `telemetry` del schema modela vuelos reales (geofence, readings, etc.),
  // metemos el cierre manual en `raw` para no falsificar campos técnicos.
  const previousTelemetry = existing.telemetry ?? {};
  const completedAt = new Date().toISOString();
  const telemetryStub = {
    ...previousTelemetry,
    finishedAt: completedAt,
    raw: {
      ...(previousTelemetry.raw as Record<string, unknown> | undefined ?? {}),
      manual: true,
      completedBy: userId,
      completedAt,
      notes: input.telemetryNotes ?? null,
    },
  };

  await db
    .update(missions)
    .set({
      areaTreatedHa: input.areaTreatedHa.toFixed(4),
      telemetry: telemetryStub,
    })
    .where(eq(missions.id, id));

  return transitionMission(id, "completed");
}
