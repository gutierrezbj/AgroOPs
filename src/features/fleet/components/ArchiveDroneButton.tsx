"use client";

/**
 * AgroOps — ArchiveDroneButton
 *
 * Botón aislado para archivar un dron desde la pantalla de edición. Usa
 * `useActionState` con `archiveDroneAction` (RBAC `ADMIN_ONLY` aplicado en
 * la action). Se renderiza sólo si el server determina que el user es admin.
 */
import { useActionState } from "react";
import {
  archiveDroneAction,
  initialArchiveDroneState,
} from "../actions/archive-drone";

export function ArchiveDroneButton({ droneId }: { droneId: string }) {
  const [state, formAction, pending] = useActionState(
    archiveDroneAction,
    initialArchiveDroneState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "¿Archivar este dron? Quedará marcado como retirado y fuera de las misiones nuevas.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={droneId} />
      <button type="submit" disabled={pending} className="btn-danger">
        {pending ? "Archivando…" : "Archivar dron"}
      </button>
      {state.ok && (
        <p role="status">Dron archivado.</p>
      )}
      {!state.ok && state.error && (
        <p role="alert">{state.error}</p>
      )}
    </form>
  );
}
