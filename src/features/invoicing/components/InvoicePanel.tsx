"use client";

/**
 * AgroOps — InvoicePanel (HU-19)
 *
 * Panel "Factura Holded" en el detail de la misión. Muestra:
 * - Estado actual (pending / issued / paid / cancelled / error) con badge.
 * - holded invoice id + número + link al PDF en Holded.
 * - Importe en € (denormalizado desde Holded).
 * - Si status === "error", el último mensaje de fallo + botón "Reintentar".
 * - Si no hay invoice todavía y la misión está en `completed`, botón
 *   "Disparar facturación" (admin only).
 */
import { useActionState } from "react";
import type { InvoiceRef } from "@/db/schema/invoices-ref";
import type { MissionStatus } from "@/db/schema/missions";
import { dispatchInvoiceAction } from "../actions/dispatch-invoice";
import {
  initialDispatchInvoiceState,
  type DispatchInvoiceState,
} from "../actions/dispatch-invoice.types";

interface InvoicePanelProps {
  missionId: string;
  missionStatus: MissionStatus;
  invoice: InvoiceRef | null;
  canDispatch: boolean;
}

export function InvoicePanel({
  missionId,
  missionStatus,
  invoice,
  canDispatch,
}: InvoicePanelProps) {
  const [state, formAction, pending] = useActionState(
    dispatchInvoiceAction,
    initialDispatchInvoiceState,
  );

  // Si el action terminó OK, mostramos esos datos por encima del invoice cached
  const effective = state.ok
    ? {
        status: "issued" as const,
        holdedInvoiceId: state.invoiceId ?? null,
        holdedInvoiceNumber: state.invoiceNumber ?? null,
        holdedInvoiceUrl: state.invoiceUrl ?? null,
        amount: state.amountEur?.toFixed(2) ?? null,
        currency: "EUR",
        errorMessage: null,
        issuedAt: new Date(),
      }
    : invoice;

  const showDispatchButton =
    canDispatch &&
    (missionStatus === "completed" ||
      (effective && effective.status === "error"));

  return (
    <section className="invoice-panel" aria-label="Factura Holded">
      <header className="invoice-panel__header">
        <h2>Factura Holded</h2>
        <p>
          Disparo automático al transitar la misión de{" "}
          <code>completed</code> a <code>invoiced</code>. El operador puede
          también disparar/reintentar manualmente desde aquí.
        </p>
      </header>

      {!effective ? (
        <p className="invoice-panel__empty">
          No hay factura registrada para esta misión todavía.
        </p>
      ) : (
        <dl className="invoice-panel__data">
          <dt>Estado</dt>
          <dd>
            <StatusBadge status={effective.status} />
            {effective.issuedAt && (
              <small className="invoice-panel__timestamp mono">
                {" · "}emitida{" "}
                {new Date(effective.issuedAt).toLocaleString("es-ES")}
              </small>
            )}
          </dd>

          {effective.holdedInvoiceNumber && (
            <>
              <dt>Número factura</dt>
              <dd className="mono">{effective.holdedInvoiceNumber}</dd>
            </>
          )}
          {effective.holdedInvoiceId && (
            <>
              <dt>Holded invoice ID</dt>
              <dd className="mono">{effective.holdedInvoiceId}</dd>
            </>
          )}
          {effective.amount && (
            <>
              <dt>Importe</dt>
              <dd>
                <strong>
                  {parseFloat(effective.amount).toFixed(2)} {effective.currency}
                </strong>
              </dd>
            </>
          )}
          {effective.holdedInvoiceUrl && (
            <>
              <dt>Enlace</dt>
              <dd>
                <a
                  href={effective.holdedInvoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir en Holded ↗
                </a>
              </dd>
            </>
          )}
          {effective.status === "error" && effective.errorMessage && (
            <>
              <dt>Último error</dt>
              <dd className="invoice-panel__error-msg">
                {effective.errorMessage}
              </dd>
            </>
          )}
        </dl>
      )}

      {showDispatchButton && (
        <form action={formAction} className="invoice-panel__form">
          <input type="hidden" name="missionId" value={missionId} />
          <button
            type="submit"
            disabled={pending}
            className="invoice-panel__btn"
          >
            {pending
              ? "Disparando…"
              : effective && effective.status === "error"
                ? "Reintentar facturación"
                : "Disparar facturación"}
          </button>
        </form>
      )}

      <DispatchFeedback state={state} pending={pending} />
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pendiente", cls: "info" },
    issued: { label: "Emitida", cls: "ok" },
    paid: { label: "Pagada", cls: "ok" },
    cancelled: { label: "Cancelada", cls: "warn" },
    error: { label: "Error", cls: "danger" },
  };
  const meta = map[status] ?? { label: status, cls: "info" };
  return (
    <span className={`invoice-panel__badge invoice-panel__badge--${meta.cls}`}>
      {meta.label}
    </span>
  );
}

function DispatchFeedback({
  state,
  pending,
}: {
  state: DispatchInvoiceState;
  pending: boolean;
}) {
  if (pending) return null;
  if (state.ok) {
    return (
      <p role="status" className="invoice-panel__success">
        Factura emitida correctamente
        {state.amountEur != null && (
          <>
            : <strong>{state.amountEur.toFixed(2)} €</strong> (subtotal{" "}
            {state.subtotalEur?.toFixed(2)} + IVA {state.vatEur?.toFixed(2)})
          </>
        )}
      </p>
    );
  }
  if (!state.error) return null;
  const hint = reasonHint(state.reason);
  return (
    <div className="invoice-panel__feedback-error" role="alert">
      <strong>Error:</strong> {state.error}
      {hint && <p className="invoice-panel__hint">{hint}</p>}
    </div>
  );
}

function reasonHint(reason: DispatchInvoiceState["reason"]): string | null {
  switch (reason) {
    case "client-not-synced":
      return "Sincroniza el cliente con Holded desde su ficha y vuelve a intentar.";
    case "albaran-missing":
      return "Crea el albarán para esta misión y fírmalo antes de facturar.";
    case "albaran-not-signed":
      return "El albarán existe pero no está firmado por el agricultor — sin firma no se factura.";
    case "price-not-configured":
      return "Define AGROOPS_PRICE_PER_HA_EUR en .env.local y reinicia el servidor.";
    case "area-missing":
      return "Indica el área tratada al cerrar la misión (botón Cerrar misión).";
    case "not-configured":
      return "Define HOLDED_API_KEY en .env.local y reinicia el servidor.";
    case "unauthorized":
      return "API key Holded rechazada. Revisa en Holded → Configuración → Desarrolladores.";
    case "rate-limited":
      return "Holded rate limit alcanzado. Reintenta en unos minutos.";
    case "server-error":
      return "Holded está respondiendo con error de servidor. Reintenta en unos minutos.";
    case "network":
      return "Timeout o error de red. Verifica conectividad y reintenta.";
    case "forbidden":
      return "Tu rol no permite disparar facturas (requiere admin).";
    case "mission-not-completed":
      return "La misión debe estar en estado 'completed' antes de facturar.";
    case "already-invoiced":
      return "Esta misión ya tiene factura emitida.";
    default:
      return null;
  }
}
