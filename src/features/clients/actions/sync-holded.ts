"use server";

/**
 * AgroOps — syncClientToHoldedAction (HU-18)
 *
 * Dispara la sincronización del cliente con el directorio de contactos
 * Holded. RBAC `WRITERS` (admin + operario). Audita con
 * `client.holded_linked` (matched existing) o `client.holded_created`
 * (nuevo contacto). Si Holded falla, captura `HoldedError` y devuelve el
 * `reason` tipado para que la UI muestre el mensaje correcto.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, ForbiddenError, requireRole } from "@/lib/rbac";
import { HoldedError } from "@/server/integrations/holded";
import { syncClientToHolded } from "../services";
import {
  initialSyncHoldedState,
  type SyncHoldedState,
} from "./sync-holded.types";

const idSchema = z.string().uuid("clientId inválido");

export async function syncClientToHoldedAction(
  _prev: SyncHoldedState,
  formData: FormData,
): Promise<SyncHoldedState> {
  try {
    const session = await auth();
    requireRole(session, ROLES.WRITERS);

    const parsed = idSchema.safeParse(formData.get("clientId"));
    if (!parsed.success) {
      return {
        ok: false,
        reason: "internal",
        error: parsed.error.issues[0]?.message ?? "clientId inválido",
      };
    }

    const result = await syncClientToHolded(parsed.data);

    await logAudit({
      userId: session.user.id,
      action: result.created
        ? "client.holded_created"
        : "client.holded_linked",
      entityType: "client",
      entityId: result.client.id,
      after: {
        holdedContactId: result.contact.id,
        cached: result.cached,
        created: result.created,
      },
    });

    revalidatePath(`/dashboard/clients/${result.client.id}`);
    revalidatePath("/dashboard/clients");

    return {
      ok: true,
      contactId: result.contact.id,
      created: result.created,
      cached: result.cached,
    };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return {
        ok: false,
        reason: "forbidden",
        error: err.message,
      };
    }
    if (err instanceof HoldedError) {
      return {
        ok: false,
        reason: err.kind,
        error: err.message,
      };
    }
    if (err instanceof Error) {
      return {
        ok: false,
        reason: "internal",
        error: err.message,
      };
    }
    return initialSyncHoldedState;
  }
}
