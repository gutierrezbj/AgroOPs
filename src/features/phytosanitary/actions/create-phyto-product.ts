"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { createPhytoProductSchema } from "../schemas";
import { createPhytoProduct } from "../services";
import type { CreatePhytoProductState } from "./create-phyto-product.types";

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

export async function createPhytoProductAction(
  _prev: CreatePhytoProductState,
  formData: FormData,
): Promise<CreatePhytoProductState> {
  const session = await auth();
  requireRole(session, ROLES.WRITERS);

  const raw = {
    commercialName: formData.get("commercialName"),
    activeIngredient: formData.get("activeIngredient"),
    mapaRegistration: nullableString(formData.get("mapaRegistration")),
    formulation: nullableString(formData.get("formulation")),
    lotNumber: formData.get("lotNumber"),
    expiresAt: formData.get("expiresAt"),
    recommendedDoseValue: nullableNumber(formData.get("recommendedDoseValue")),
    recommendedDoseUnit: nullableString(formData.get("recommendedDoseUnit")),
    safetyPeriodDays: nullableNumber(formData.get("safetyPeriodDays")),
    active: formData.get("active") === "on" || formData.get("active") === null,
    notes: nullableString(formData.get("notes")),
  };

  const parsed = createPhytoProductSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisa los campos resaltados", fieldErrors };
  }

  const product = await createPhytoProduct(parsed.data);

  await logAudit({
    userId: session.user.id,
    action: "phyto.created",
    entityType: "phytosanitary_product",
    entityId: product.id,
    after: product,
  });

  revalidatePath("/dashboard/phytosanitary");

  return {
    ok: true,
    product: {
      id: product.id,
      commercialName: product.commercialName,
      lotNumber: product.lotNumber,
    },
  };
}
