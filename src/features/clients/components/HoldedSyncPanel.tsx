"use client";

/**
 * AgroOps — HoldedSyncPanel (HU-18)
 *
 * Panel con el estado actual de sincronización Holded de un cliente +
 * botón para disparar `syncClientToHoldedAction`. Maneja los 7 `reason`
 * de error tipados:
 *
 * - not-configured → mensaje pidiendo configurar HOLDED_API_KEY
 * - unauthorized   → API key inválida
 * - rate-limited   → Holded rechazó por rate limit
 * - server-error   → Holded caído
 * - network        → timeout
 * - bad-response   → respuesta inesperada
 * - forbidden      → sesión sin rol WRITERS
 * - internal       → error genérico (cliente no existe, etc.)
 */
import { useActionState } from "react";
import { syncClientToHoldedAction } from "../actions/sync-holded";
import {
  initialSyncHoldedState,
  type SyncHoldedState,
} from "../actions/sync-holded.types";

interface HoldedSyncPanelProps {
  clientId: string;
  currentContactId: string | null;
}

export function HoldedSyncPanel({
  clientId,
  currentContactId,
}: HoldedSyncPanelProps) {
  const [state, formAction, pending] = useActionState(
    syncClientToHoldedAction,
    initialSyncHoldedState,
  );

  const linked = state.ok ? state.contactId : currentContactId;

  return (
    <section className="holded-sync" aria-label="Sincronización Holded">
      <header className="holded-sync__header">
        <h2>Facturación Holded</h2>
        <p>
          AgroOps dispara facturas vía API contra el directorio de contactos
          Holded (ADR-6). La sincronización es idempotente: si el cliente ya
          existe en Holded por CIF/NIF o email se enlaza, si no se crea.
        </p>
      </header>

      <dl className="holded-sync__status">
        <dt>Estado</dt>
        <dd>
          {linked ? (
            <span className="holded-sync__badge holded-sync__badge--ok">
              ✓ Vinculado
            </span>
          ) : (
            <span className="holded-sync__badge holded-sync__badge--warn">
              Sin sincronizar
            </span>
          )}
        </dd>
        <dt>Holded contact ID</dt>
        <dd>
          {linked ? (
            <code className="mono">{linked}</code>
          ) : (
            <span className="holded-sync__muted">—</span>
          )}
        </dd>
      </dl>

      <form action={formAction} className="holded-sync__form">
        <input type="hidden" name="clientId" value={clientId} />
        <button
          type="submit"
          disabled={pending}
          className="holded-sync__btn"
        >
          {pending
            ? "Sincronizando…"
            : currentContactId
              ? "Re-sincronizar"
              : "Sincronizar con Holded"}
        </button>
      </form>

      <SyncFeedback state={state} pending={pending} />
    </section>
  );
}

function SyncFeedback({
  state,
  pending,
}: {
  state: SyncHoldedState;
  pending: boolean;
}) {
  if (pending) return null;

  if (state.ok) {
    return (
      <p role="status" className="holded-sync__success">
        {state.created
          ? "Contacto creado en Holded."
          : state.cached
            ? "Contacto ya estaba vinculado (cache hit, sin round-trip)."
            : "Contacto existente enlazado en Holded."}
      </p>
    );
  }

  if (!state.error) return null;

  const hint = reasonHint(state.reason);
  return (
    <div className="holded-sync__error" role="alert">
      <strong>Error al sincronizar:</strong> {state.error}
      {hint && <p className="holded-sync__hint">{hint}</p>}
    </div>
  );
}

function reasonHint(reason: SyncHoldedState["reason"]): string | null {
  switch (reason) {
    case "not-configured":
      return "Define HOLDED_API_KEY en .env.local y reinicia el servidor.";
    case "unauthorized":
      return "La API key fue rechazada. Verifica en la cuenta Holded → Configuración → Desarrolladores.";
    case "rate-limited":
      return "Holded rate limit. Reintenta en unos minutos o pide aumentar el límite.";
    case "server-error":
      return "Holded está respondiendo con error de servidor. Reintenta en unos minutos.";
    case "network":
      return "Timeout o error de red. Verifica conectividad y reintenta.";
    case "forbidden":
      return "Tu rol no permite sincronizar (requiere admin u operario).";
    default:
      return null;
  }
}
