"use client";

/**
 * AgroOps — ArchivePilotButton
 *
 * Botón aislado para archivar piloto (active=false) desde la pantalla de
 * edición. Sólo se renderiza si el server determina que el user es admin.
 */
import { useActionState } from "react";
import { archivePilotAction } from "../actions/archive-pilot";
import { initialArchivePilotState } from "../actions/archive-pilot.types";

export function ArchivePilotButton({ pilotId }: { pilotId: string }) {
  const [state, formAction, pending] = useActionState(
    archivePilotAction,
    initialArchivePilotState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "¿Archivar este piloto? Quedará marcado como inactivo y fuera de las misiones nuevas.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={pilotId} />
      <button type="submit" disabled={pending} className="btn-danger">
        {pending ? "Archivando…" : "Archivar piloto"}
      </button>
      {state.ok && <p role="status">Piloto archivado.</p>}
      {!state.ok && state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
