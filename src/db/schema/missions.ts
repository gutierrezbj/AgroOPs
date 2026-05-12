/**
 * AgroOps — missions
 *
 * Operaciones con state machine. En v1 solo tipo `aerial_application`.
 *
 * State machine (HU-10):
 *   draft → planned → approved → preflight → in_flight → completed → invoiced
 *   cualquier estado → cancelled
 *
 * Las transiciones se validan en server/services/missions/state-machine.ts.
 */
import {
  decimal,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { clients } from "./clients";
import { pilots } from "./pilots";
import { drones } from "./drones";

export const missionTypeEnum = pgEnum("mission_type", ["aerial_application"]);

export const missionStatusEnum = pgEnum("mission_status", [
  "draft",
  "planned",
  "approved",
  "preflight",
  "in_flight",
  "completed",
  "invoiced",
  "cancelled",
]);

export const missions = pgTable(
  "missions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(), // "AGM-2026-0001"
    type: missionTypeEnum("type").notNull().default("aerial_application"),
    status: missionStatusEnum("status").notNull().default("draft"),

    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    pilotId: uuid("pilot_id").references(() => pilots.id, {
      onDelete: "set null",
    }),
    droneId: uuid("drone_id").references(() => drones.id, {
      onDelete: "set null",
    }),

    // Cumplimiento operativo: NPTA bajo paraguas Drovinci hasta SORA propia AgroM (ADR-5)
    nptaReference: text("npta_reference").notNull(),

    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    areaPlannedHa: decimal("area_planned_ha", { precision: 10, scale: 4 }),
    areaTreatedHa: decimal("area_treated_ha", { precision: 10, scale: 4 }),

    // Snapshot AEMET capturado al iniciar preflight (viento, lluvia, temperatura, apto)
    weatherSnapshot: jsonb("weather_snapshot").$type<{
      capturedAt: string;
      stationId?: string;
      windSpeedMs?: number;
      windDirectionDeg?: number;
      precipitationMm?: number;
      temperatureC?: number;
      humidityPct?: number;
      flightSuitable?: boolean;
      raw?: unknown;
    } | null>(),

    // Telemetría capturada durante vuelo (geofence, timestamps, lecturas T50)
    telemetry: jsonb("telemetry").$type<{
      geofence?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
      startedAt?: string;
      finishedAt?: string;
      durationSeconds?: number;
      readings?: Array<{ t: string; lat: number; lng: number; altM?: number }>;
      raw?: unknown;
    } | null>(),

    notes: text("notes"),
    ...timestamps,
  },
  (table) => ({
    statusIdx: index("missions_status_idx").on(table.status),
    scheduledIdx: index("missions_scheduled_idx").on(table.scheduledAt),
    clientIdx: index("missions_client_idx").on(table.clientId),
  })
);

export type Mission = typeof missions.$inferSelect;
export type NewMission = typeof missions.$inferInsert;
export type MissionStatus = (typeof missionStatusEnum.enumValues)[number];
export type MissionType = (typeof missionTypeEnum.enumValues)[number];
