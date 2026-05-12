"use server";

/**
 * AgroOps — dispatchInvoiceAction (HU-19)
 *
 * Server Action que dispara manualmente la facturación de una misión
 * completada. Útil cuando:
 * - El primer intento automático (en `transitionMission`) falló y se
 *   persistió `invoices_ref.status = 'error'`.
 * - El operario quiere disparar la factura antes de transitar a "invoiced"
 *   para revisar el resultado.
 *
 * RBAC: `ADMIN_ONLY` — la facturación dispara movimientos económicos
 * (mismo criterio que la transición `completed → invoiced`).
 *
 * El audit log distingue entre disparo manual (`mission.invoice_dispatched`)
 * y reintento tras error.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, ForbiddenError, requireRole } from "@/lib/rbac";
import { HoldedError } from "@/server/integrations/holded";
import {
  createInvoiceForMission,
  InvoicingError,
} from "../services";
import {
  initialDispatchInvoiceState,
  type DispatchInvoiceState,
} from "./dispatch-invoice.types";

const idSchema = z.string().uuid("missionId inválido");

export async function dispatchInvoiceAction(
  _prev: DispatchInvoiceState,
  formData: FormData,
): Promise<DispatchInvoiceState> {
  try {
    const session = await auth();
    requireRole(session, ROLES.ADMIN_ONLY);

    const parsed = idSchema.safeParse(formData.get("missionId"));
    if (!parsed.success) {
      return {
        ok: false,
        reason: "internal",
        error: parsed.error.issues[0]?.message ?? "missionId inválido",
      };
    }

    const result = await createInvoiceForMission(parsed.data);

    await logAudit({
      userId: session.user.id,
      action: "mission.invoice_dispatched",
      entityType: "mission",
      entityId: parsed.data,
      after: {
        holdedInvoiceId: result.holded.invoiceId,
        holdedInvoiceNumber: result.holded.invoiceNumber ?? null,
        totalEur: result.totalEur,
        subtotalEur: result.subtotalEur,
        vatEur: result.vatEur,
        vatPct: result.vatPct,
      },
    });

    revalidatePath(`/dashboard/missions/${parsed.data}`);

    return {
      ok: true,
      invoiceId: result.holded.invoiceId,
      invoiceNumber: result.holded.invoiceNumber,
      invoiceUrl: result.invoiceRef.holdedInvoiceUrl ?? undefined,
      amountEur: result.totalEur,
      subtotalEur: result.subtotalEur,
      vatEur: result.vatEur,
    };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { ok: false, reason: "forbidden", error: err.message };
    }
    if (err instanceof InvoicingError) {
      return { ok: false, reason: err.kind, error: err.message };
    }
    if (err instanceof HoldedError) {
      return { ok: false, reason: err.kind, error: err.message };
    }
    if (err instanceof Error) {
      return { ok: false, reason: "internal", error: err.message };
    }
    return initialDispatchInvoiceState;
  }
}
