"use server";

/**
 * AgroOps — updateClientAction (HU-06)
 *
 * Update parcial. RBAC `WRITERS`. Verifica unicidad de taxId si se cambia.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { clientIdSchema, updateClientSchema } from "../schemas";
import { getClient, getClientByTaxId, updateClient } from "../services";
import type { UpdateClientState } from "./update-client.types";

function nullableString(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function updateClientAction(
  _prev: UpdateClientState,
  formData: FormData,
): Promise<UpdateClientState> {
  const session = await auth();
  requireRole(session, ROLES.WRITERS);

  const id = clientIdSchema.parse(formData.get("id"));
  const before = await getClient(id);
  if (!before) {
    return { ok: false, error: "Cliente no encontrado" };
  }

  const raw = {
    name: formData.get("name") ?? undefined,
    taxId: formData.get("taxId") ?? undefined,
    type: formData.get("type") ?? undefined,
    contactPerson: nullableString(formData.get("contactPerson")),
    contactEmail: nullableString(formData.get("contactEmail")),
    contactPhone: nullableString(formData.get("contactPhone")),
    billingAddress: nullableString(formData.get("billingAddress")),
    city: nullableString(formData.get("city")),
    province: nullableString(formData.get("province")),
    postalCode: nullableString(formData.get("postalCode")),
    country: formData.get("country") ?? undefined,
    holdedContactId: nullableString(formData.get("holdedContactId")),
    notes: nullableString(formData.get("notes")),
  };

  const parsed = updateClientSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisa los campos resaltados", fieldErrors };
  }

  if (parsed.data.taxId !== undefined && parsed.data.taxId !== before.taxId) {
    const conflict = await getClientByTaxId(parsed.data.taxId);
    if (conflict && conflict.id !== id) {
      return {
        ok: false,
        error: "Ya existe otro cliente con ese CIF/NIF",
        fieldErrors: { taxId: "Ya existe otro cliente con ese CIF/NIF" },
      };
    }
  }

  const updated = await updateClient(id, parsed.data);
  if (!updated) {
    return { ok: false, error: "No se pudo actualizar el cliente" };
  }

  await logAudit({
    userId: session.user.id,
    action: "client.updated",
    entityType: "client",
    entityId: id,
    before,
    after: updated,
  });

  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${id}`);

  return { ok: true, clientId: id };
}
