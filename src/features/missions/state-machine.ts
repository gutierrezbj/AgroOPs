/**
 * AgroOps — mission state machine (HU-10)
 *
 * Implementa las transiciones permitidas, los roles autorizados por
 * transición y los gates de pre-requisitos. Es la pieza arquitectónica
 * central del EP-04: cualquier mutación de `missions.status` pasa por aquí.
 *
 * Flujo happy-path:
 *   draft → planned → approved → preflight → in_flight → completed → invoiced
 *
 * Cancelación: cualquier estado no-terminal → cancelled.
 * Estados terminales: invoiced, cancelled (sin salidas).
 *
 * Filosofía v1:
 * - Gates DUROS sólo en las transiciones donde los pre-requisitos están bien
 *   modelados (draft→planned: recursos asignados; in_flight→completed:
 *   telemetría + área).
 * - Gates SOFT (warnings, no bloqueos) para fases que dependen de integraciones
 *   aún no implementadas (preflight requiere AEMET = HU-13; completed→invoiced
 *   requiere albarán firmado = HU-15+).
 * - El operador puede salirse del happy path pero queda audit log.
 */
import type { Drone } from "@/db/schema/drones";
import type { Mission, MissionStatus } from "@/db/schema/missions";
import type { Pilot } from "@/db/schema/pilots";
import type { UserRole } from "@/db/schema/users";
import { ROLES } from "@/lib/rbac";

/**
 * Tabla de transiciones permitidas. Si la HU-10 evoluciona, ampliar aquí
 * (no esparcir lógica de transición en services/actions).
 */
export const MISSION_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  draft: ["planned", "cancelled"],
  planned: ["approved", "cancelled"],
  approved: ["preflight", "cancelled"],
  preflight: ["in_flight", "cancelled"],
  in_flight: ["completed", "cancelled"],
  completed: ["invoiced", "cancelled"],
  invoiced: [], // terminal
  cancelled: [], // terminal
};

/**
 * Roles autorizados por transición. Clave: `from->to`.
 * Si no está mapeada → ROLES.WRITERS (admin + operario).
 */
export const TRANSITION_ROLES: Record<string, readonly UserRole[]> = {
  "draft->planned": ROLES.WRITERS,
  "planned->approved": ROLES.ADMIN_ONLY,
  "approved->preflight": ROLES.FIELD_OPERATIONS,
  "preflight->in_flight": ROLES.PILOT_OPERATIONS,
  "in_flight->completed": ROLES.PILOT_OPERATIONS,
  "completed->invoiced": ROLES.ADMIN_ONLY,
  // <state>->cancelled usa default WRITERS
};

/**
 * Contexto necesario para evaluar gates. Lo construye el service antes de
 * llamar a `evaluateGate` (joins de drone, pilot, count de mission_parcels).
 */
export interface GateContext {
  mission: Mission;
  drone: Drone | null;
  pilot: Pilot | null;
  parcelCount: number;
}

export interface GateResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Checa si una transición es estructuralmente válida (existe en la tabla).
 * No comprueba gates ni roles.
 */
export function canTransition(
  from: MissionStatus,
  to: MissionStatus,
): boolean {
  return (MISSION_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Devuelve los roles autorizados para una transición concreta.
 * Default: `ROLES.WRITERS` (cancelaciones administrativas, etc.).
 */
export function rolesForTransition(
  from: MissionStatus,
  to: MissionStatus,
): readonly UserRole[] {
  const key = `${from}->${to}`;
  return TRANSITION_ROLES[key] ?? ROLES.WRITERS;
}

/**
 * Lista las transiciones legales desde un estado, descartando el actual.
 * Útil para renderizar botones "Aprobar", "Cancelar", etc. en la UI.
 */
export function availableTransitions(
  from: MissionStatus,
): MissionStatus[] {
  return [...(MISSION_TRANSITIONS[from] ?? [])];
}

/**
 * Evalúa los pre-requisitos (gates) para una transición. Devuelve:
 * - `ok`: false si hay errores duros.
 * - `errors`: array de mensajes que el operador debe resolver.
 * - `warnings`: array de mensajes informativos (no bloquean).
 *
 * No comprueba rol — eso se hace en la Server Action con `requireRole`.
 */
export function evaluateGate(
  from: MissionStatus,
  to: MissionStatus,
  ctx: GateContext,
): GateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!canTransition(from, to)) {
    return {
      ok: false,
      errors: [`Transición ${from} → ${to} no permitida en la state machine`],
      warnings: [],
    };
  }

  // ─── Cancelación: siempre OK, pero recordamos que cancelled es terminal.
  if (to === "cancelled") {
    return { ok: true, errors: [], warnings: [] };
  }

  // ─── draft → planned: recursos asignados (parcels + drone aplicador + piloto ROPO).
  if (from === "draft" && to === "planned") {
    if (ctx.parcelCount < 1) {
      errors.push("Asigna al menos una parcela a la misión");
    }

    if (!ctx.mission.droneId) {
      errors.push("Asigna un dron a la misión");
    } else if (ctx.drone) {
      if (!ctx.drone.applicationCapable) {
        errors.push(
          `El dron asignado (${ctx.drone.model}) no es aplicador. Selecciona uno con applicationCapable=true (T50, etc.)`,
        );
      }
      if (ctx.drone.status === "retired") {
        errors.push(
          `El dron asignado (${ctx.drone.model}) está retirado de la flota`,
        );
      } else if (ctx.drone.status === "maintenance") {
        warnings.push(
          `El dron asignado (${ctx.drone.model}) está en mantenimiento`,
        );
      }
    }

    if (!ctx.mission.pilotId) {
      errors.push("Asigna un piloto a la misión");
    } else if (ctx.pilot) {
      if (!ctx.pilot.active) {
        errors.push(
          `El piloto asignado (${ctx.pilot.fullName}) está inactivo`,
        );
      }
      if (!ctx.pilot.ropoQualified) {
        errors.push(
          `El piloto asignado (${ctx.pilot.fullName}) no tiene cualificación ROPO`,
        );
      }
    }
  }

  // ─── planned → approved: solo admin (validado por rol).
  // No hay gate adicional aquí; la decisión es humana.

  // ─── approved → preflight: requiere weatherSnapshot capturado (HU-13).
  // En v1 lo dejamos como warning hasta que HU-13 lo capture en server.
  if (from === "approved" && to === "preflight") {
    if (!ctx.mission.weatherSnapshot) {
      warnings.push(
        "No hay snapshot meteorológico capturado (HU-13 lo capturará automáticamente al entrar en preflight)",
      );
    } else if (ctx.mission.weatherSnapshot.flightSuitable === false) {
      errors.push(
        "El snapshot meteorológico indica que no es apto para vuelo",
      );
    }
  }

  // ─── preflight → in_flight: efecto lateral (startedAt = now()) en service.
  // Gate ligero: confirmar que el operador ha revisado el preflight.

  // ─── in_flight → completed: telemetría + área tratada.
  if (from === "in_flight" && to === "completed") {
    if (!ctx.mission.telemetry) {
      errors.push(
        "Captura la telemetría del vuelo antes de marcar la misión como completada",
      );
    }
    if (!ctx.mission.areaTreatedHa) {
      errors.push("Indica el área tratada en hectáreas");
    }
  }

  // ─── completed → invoiced: requiere albarán firmado + invoice_ref creada.
  // HU-15+ creará el albarán; en v1 sólo aviso.
  if (from === "completed" && to === "invoiced") {
    warnings.push(
      "Verificar que existe albarán firmado y referencia Holded antes de marcar como facturada (HU-15..20)",
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Label humano para cada estado (UI badges y dropdowns).
 */
export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  draft: "Borrador",
  planned: "Planificada",
  approved: "Aprobada",
  preflight: "Preflight",
  in_flight: "En vuelo",
  completed: "Completada",
  invoiced: "Facturada",
  cancelled: "Cancelada",
};

/**
 * Label corto para los botones de transición de UI.
 */
export const TRANSITION_LABELS: Record<string, string> = {
  "draft->planned": "Planificar",
  "draft->cancelled": "Cancelar",
  "planned->approved": "Aprobar",
  "planned->cancelled": "Cancelar",
  "approved->preflight": "Iniciar preflight",
  "approved->cancelled": "Cancelar",
  "preflight->in_flight": "Iniciar vuelo",
  "preflight->cancelled": "Cancelar",
  "in_flight->completed": "Marcar completada",
  "in_flight->cancelled": "Cancelar",
  "completed->invoiced": "Marcar facturada",
  "completed->cancelled": "Cancelar",
};
