"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { phytoProductIdSchema, updatePhytoProductSchema } from "../schemas";
import { getPhytoProduct, updatePhytoProduct } from "../services";
import type { UpdatePhytoProductState } from "./update-phyto-product.types";

function nullableString(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function nullableNumber(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function updatePhytoProductAction(
  _prev: UpdatePhytoProductState,
  formData: FormData,
): Promise<UpdatePhytoProductState> {
  const session = await auth();
  requireRole(session, ROLES.WRITERS);

  const id = phytoProductIdSchema.parse(formData.get("id"));
  const before = await getPhytoProduct(id);
  if (!before) {
    return { ok: false, error: "Producto no encontrado" };
  }

  const raw = {
    commercialName: formData.get("commercialName") ?? undefined,
    activeIngredient: formData.get("activeIngredient") ?? undefined,
    mapaRegistration: nullableString(formData.get("mapaRegistration")),
    formulation: nullableString(formData.get("formulation")),
    lotNumber: formData.get("lotNumber") ?? undefined,
    expiresAt: formData.get("expiresAt") ?? undefined,
    recommendedDoseValue: nullableNumber(formData.get("recommendedDoseValue")),
    recommendedDoseUnit: nullableString(formData.get("recommendedDoseUnit")),
    safetyPeriodDays: nullableNumber(formData.get("safetyPeriodDays")),
    active:
      formData.get("active") === "on"
        ? true
        : formData.get("active") === "off"
          ? false
          : undefined,
    notes: nullableString(formData.get("notes")),
  };

  const parsed = updatePhytoProductSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisa los campos resaltados", fieldErrors };
  }

  const updated = await updatePhytoProduct(id, parsed.data);
  if (!updated) {
    return { ok: false, error: "No se pudo actualizar el producto" };
  }

  await logAudit({
    userId: session.user.id,
    action: "phyto.updated",
    entityType: "phytosanitary_product",
    entityId: id,
    before,
    after: updated,
  });

  revalidatePath("/dashboard/phytosanitary");
  revalidatePath(`/dashboard/phytosanitary/${id}`);

  return { ok: true, productId: id };
}
