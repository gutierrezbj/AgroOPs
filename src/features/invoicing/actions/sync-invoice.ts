"use server";

/**
 * AgroOps — syncInvoiceStatusAction (HU-20)
 *
 * Pregunta a Holded el estado actual de la factura asociada a una misión y
 * actualiza `invoices_ref` si cambió (issued → paid o issued → cancelled).
 * Útil para reconciliación manual cuando el operador cobra la factura en
 * Holded y quiere reflejarlo en AgroOps sin esperar al job batch (HU-25).
 *
 * RBAC: `ADMIN_ONLY` — la sincronización refleja cambios económicos en DB.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, ForbiddenError, requireRole } from "@/lib/rbac";
import { HoldedError } from "@/server/integrations/holded";
import {
  InvoicingError,
  syncInvoiceStatusForMission,
} from "../services";
import {
  initialSyncInvoiceState,
  type SyncInvoiceState,
} from "./sync-invoice.types";

const idSchema = z.string().uuid("missionId inválido");

export async function syncInvoiceStatusAction(
  _prev: SyncInvoiceState,
  formData: FormData,
): Promise<SyncInvoiceState> {
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

    const result = await syncInvoiceStatusForMission(parsed.data);

    if (result.changed) {
      await logAudit({
        userId: session.user.id,
        action: "mission.invoice_status_synced",
        entityType: "mission",
        entityId: parsed.data,
        after: {
          status: result.invoiceRef.status,
          paidAt: result.invoiceRef.paidAt?.toISOString() ?? null,
          amount: result.invoiceRef.amount,
          holdedInvoiceNumber: result.invoiceRef.holdedInvoiceNumber,
        },
      });
      revalidatePath(`/dashboard/missions/${parsed.data}`);
    }

    return {
      ok: true,
      newStatus: result.invoiceRef.status,
      previousStatus: result.changed
        ? // Para el feedback en UI, decimos cuál era antes derivándolo del snapshot
          //   issued si paid/cancelled actual era issued antes, etc.
          // Como ya persistimos, no tenemos el "antes" — devolvemos el actual.
          result.invoiceRef.status
        : result.invoiceRef.status,
      changed: result.changed,
      paidAt: result.invoiceRef.paidAt?.toISOString() ?? null,
      amountEur: result.invoiceRef.amount
        ? parseFloat(result.invoiceRef.amount)
        : null,
    };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { ok: false, reason: "forbidden", error: err.message };
    }
    if (err instanceof InvoicingError) {
      return { ok: false, reason: "mission-not-found", error: err.message };
    }
    if (err instanceof HoldedError) {
      return { ok: false, reason: err.kind, error: err.message };
    }
    if (err instanceof Error) {
      return { ok: false, reason: "internal", error: err.message };
    }
    return initialSyncInvoiceState;
  }
}
