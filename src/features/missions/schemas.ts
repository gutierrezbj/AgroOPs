/**
 * AgroOps — missions schemas (HU-09)
 *
 * Schemas Zod para crear, editar y transitar misiones. Las parcelas se
 * gestionan por separado vía `setMissionParcelsSchema` (multi-select).
 */
import { z } from "zod";

export const missionStatusValues = [
  "draft",
  "planned",
  "approved",
  "preflight",
  "in_flight",
  "completed",
  "invoiced",
  "cancelled",
] as const;

/**
 * Fecha-hora local del input HTML5 datetime-local: `YYYY-MM-DDTHH:mm`.
 * Aceptamos también con segundos opcionales.
 */
const dateTimeString = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/,
    "Formato fecha-hora inválido (esperado YYYY-MM-DDTHH:mm)",
  );

const missionBaseShape = {
  clientId: z.string().uuid("Cliente requerido"),
  droneId: z.string().uuid("ID de dron inválido").nullable().optional(),
  pilotId: z.string().uuid("ID de piloto inválido").nullable().optional(),
  scheduledAt: dateTimeString.nullable().optional(),
  notes: z
    .string()
    .max(2000, "Notas demasiado largas")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
} satisfies Record<string, z.ZodTypeAny>;

export const createMissionSchema = z.object(missionBaseShape);

export const updateMissionSchema = z.object(missionBaseShape).partial();

/**
 * Para asignar parcelas: el operador envía un array de UUIDs de parcels.
 * El service se encarga de validar que todas pertenecen al `clientId` de
 * la misión (no permitimos cross-cliente en v1).
 */
export const setMissionParcelsSchema = z.object({
  parcelIds: z
    .array(z.string().uuid("ID de parcela inválido"))
    .min(1, "Selecciona al menos una parcela"),
});

/**
 * Transición de estado. `reason` opcional para cancelaciones.
 */
export const transitionMissionSchema = z.object({
  targetStatus: z.enum(missionStatusValues),
  reason: z
    .string()
    .max(500, "Motivo demasiado largo")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
});

/**
 * Cuando in_flight → completed, el operador puede dar de alta áreas y
 * telemetría manualmente en v1 (HU-14 traerá captura automática).
 */
export const completeMissionSchema = z.object({
  areaTreatedHa: z
    .number({ message: "Área tratada inválida" })
    .nonnegative("Área ≥ 0")
    .max(999999.9999, "Área demasiado grande"),
  telemetryNotes: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
});

export const missionIdSchema = z.string().uuid("ID de misión inválido");

export const listMissionFiltersSchema = z
  .object({
    status: z.enum(missionStatusValues).optional(),
    clientId: z.string().uuid().optional(),
    pilotId: z.string().uuid().optional(),
    droneId: z.string().uuid().optional(),
  })
  .partial();

export type CreateMissionInput = z.infer<typeof createMissionSchema>;
export type UpdateMissionInput = z.infer<typeof updateMissionSchema>;
export type SetMissionParcelsInput = z.infer<typeof setMissionParcelsSchema>;
export type TransitionMissionInput = z.infer<typeof transitionMissionSchema>;
export type CompleteMissionInput = z.infer<typeof completeMissionSchema>;
export type ListMissionFilters = z.infer<typeof listMissionFiltersSchema>;
