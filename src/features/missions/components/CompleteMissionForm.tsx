"use client";

/**
 * AgroOps — CompleteMissionForm
 *
 * Form para cerrar misión desde in_flight → completed. Requiere capturar
 * area_treated_ha y opcionalmente notas técnicas (HU-14 traerá telemetría
 * real con MapLibre + DroneHub).
 */
import { useActionState } from "react";
import { completeMissionAction } from "../actions/complete-mission";
import { initialCompleteMissionState } from "../actions/complete-mission.types";

interface CompleteMissionFormProps {
  missionId: string;
  defaultAreaHa?: string | null; // suma de mission_parcels.area_hectares como hint
}

export function CompleteMissionForm({
  missionId,
  defaultAreaHa,
}: CompleteMissionFormProps) {
  const [state, formAction, pending] = useActionState(
    completeMissionAction,
    initialCompleteMissionState,
  );

  const defaultValue = defaultAreaHa
    ? parseFloat(defaultAreaHa).toFixed(2)
    : "";

  return (
    <form action={formAction} className="drone-form">
      <fieldset disabled={pending}>
        <legend>Cerrar misión (in_flight → completed)</legend>
        <input type="hidden" name="missionId" value={missionId} />

        <label htmlFor="areaTreatedHa">
          Área tratada (ha) *
          <input
            id="areaTreatedHa"
            name="areaTreatedHa"
            type="number"
            step="0.0001"
            min={0}
            required
            defaultValue={defaultValue}
            aria-invalid={
              state.fieldErrors?.areaTreatedHa ? "true" : "false"
            }
          />
        </label>
        {state.fieldErrors?.areaTreatedHa && (
          <p role="alert" className="drone-form__error">
            {state.fieldErrors.areaTreatedHa}
          </p>
        )}

        <label htmlFor="telemetryNotes">
          Notas técnicas del vuelo
          <textarea
            id="telemetryNotes"
            name="telemetryNotes"
            rows={3}
            maxLength={2000}
            placeholder="Condiciones de vuelo, incidencias, observaciones…"
          />
        </label>

        <div className="drone-form__submit">
          <button type="submit" disabled={pending}>
            {pending ? "Cerrando…" : "Marcar misión completada"}
          </button>
          {state.ok && (
            <p role="status" className="drone-form__success">
              Misión completada.
            </p>
          )}
          {state.warnings && state.warnings.length > 0 && (
            <ul role="status" className="drone-form__success">
              {state.warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}
          {!state.ok && state.error && !state.fieldErrors && (
            <p role="alert" className="drone-form__error">
              {state.error}
            </p>
          )}
        </div>
      </fieldset>
    </form>
  );
}
