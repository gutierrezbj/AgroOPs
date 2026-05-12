"use server";

/**
 * AgroOps — createClientAction (HU-06)
 *
 * Alta de cliente. RBAC `WRITERS`, validación Zod, unique check de taxId,
 * audit `client.created`.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { createClientSchema } from "../schemas";
import { createClient, getClientByTaxId } from "../services";
import type { CreateClientState } from "./create-client.types";

function nullableString(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function createClientAction(
  _prev: CreateClientState,
  formData: FormData,
): Promise<CreateClientState> {
  const session = await auth();
  requireRole(session, ROLES.WRITERS);

  const raw = {
    name: formData.get("name"),
    taxId: formData.get("taxId"),
    type: formData.get("type") ?? "agricultor",
    contactPerson: nullableString(formData.get("contactPerson")),
    contactEmail: nullableString(formData.get("contactEmail")),
    contactPhone: nullableString(formData.get("contactPhone")),
    billingAddress: nullableString(formData.get("billingAddress")),
    city: nullableString(formData.get("city")),
    province: nullableString(formData.get("province")),
    postalCode: nullableString(formData.get("postalCode")),
    country: (formData.get("country") as string) || "ES",
    holdedContactId: nullableString(formData.get("holdedContactId")),
    notes: nullableString(formData.get("notes")),
  };

  const parsed = createClientSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisa los campos resaltados", fieldErrors };
  }

  const existing = await getClientByTaxId(parsed.data.taxId);
  if (existing) {
    return {
      ok: false,
      error: "Ya existe un cliente con ese CIF/NIF",
      fieldErrors: { taxId: "Ya existe un cliente con ese CIF/NIF" },
    };
  }

  const client = await createClient(parsed.data);

  await logAudit({
    userId: session.user.id,
    action: "client.created",
    entityType: "client",
    entityId: client.id,
    after: client,
  });

  revalidatePath("/dashboard/clients");

  return {
    ok: true,
    client: { id: client.id, name: client.name, taxId: client.taxId },
  };
}
