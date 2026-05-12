"use client";

/**
 * AgroOps — TransitionActions
 *
 * Panel de botones para transiciones disponibles desde el estado actual de
 * la misión. Cada botón confirma con `window.confirm` antes de submit.
 *
 * Para `completed`, mostramos un form separado (CompleteMissionForm) porque
 * requiere capturar areaTreatedHa y telemetryNotes.
 */
import { useActionState } from "react";
import { transitionMissionAction } from "../actions/transition-mission";
import { initialTransitionMissionState } from "../actions/transition-mission.types";
import type { MissionStatus } from "@/db/schema/missions";
import {
  TRANSITION_LABELS,
  availableTransitions,
} from "../state-machine";

interface TransitionActionsProps {
  missionId: string;
  currentStatus: MissionStatus;
  userRole: string;
}

export function TransitionActions({
  missionId,
  currentStatus,
  userRole: _userRole, // visible en UI para depurar, validación real en server
}: TransitionActionsProps) {
  const [state, formAction, pending] = useActionState(
    transitionMissionAction,
    initialTransitionMissionState,
  );

  const targets = availableTransitions(currentStatus).filter(
    // 'completed' se cierra desde CompleteMissionForm (requiere área).
    (t) => !(currentStatus === "in_flight" && t === "completed"),
  );

  if (targets.length === 0) {
    return (
      <p>
        La misión está en estado <code>{currentStatus}</code> (terminal). No
        hay transiciones disponibles.
      </p>
    );
  }

  return (
    <section className="drone-form" style={{ marginTop: "1rem" }}>
      <fieldset disabled={pending}>
        <legend>Transiciones disponibles</legend>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.6rem",
          }}
        >
          {targets.map((target) => {
            const key = `${currentStatus}->${target}`;
            const label = TRANSITION_LABELS[key] ?? `Pasar a ${target}`;
            const isDanger = target === "cancelled";
            return (
              <form action={formAction} key={target}>
                <input type="hidden" name="missionId" value={missionId} />
                <input type="hidden" name="targetStatus" value={target} />
                <button
                  type="submit"
                  className={isDanger ? "btn-danger" : undefined}
                  onClick={(e) => {
                    if (
                      isDanger &&
                      !window.confirm(
                        "¿Cancelar esta misión? La cancelación queda en el audit log pero no se puede deshacer.",
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
                >
                  {label}
                </button>
              </form>
            );
          })}
        </div>

        {state.ok && (
          <p role="status" className="drone-form__success">
            Estado actualizado: <code>{state.newStatus}</code>
          </p>
        )}
        {state.warnings && state.warnings.length > 0 && (
          <ul role="status" className="drone-form__success">
            {state.warnings.map((w, i) => (
              <li key={i}>⚠ {w}</li>
            ))}
          </ul>
        )}
        {!state.ok && state.error && (
          <p role="alert" className="drone-form__error">
            {state.error}
          </p>
        )}
      </fieldset>
    </section>
  );
}
