"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { parcelIdSchema, updateParcelSchema } from "../schemas";
import { getParcel, updateParcel } from "../services";
import type { UpdateParcelState } from "./update-parcel.types";

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

export async function updateParcelAction(
  _prev: UpdateParcelState,
  formData: FormData,
): Promise<UpdateParcelState> {
  const session = await auth();
  requireRole(session, ROLES.WRITERS);

  const id = parcelIdSchema.parse(formData.get("id"));
  const before = await getParcel(id);
  if (!before) return { ok: false, error: "Parcela no encontrada" };

  const rawGeometry = formData.get("geometry");
  // Si el geometry está vacío, no se actualiza (el operador no quiso tocarlo).
  const geometryProvided =
    rawGeometry != null && String(rawGeometry).trim() !== "";

  const raw = {
    clientId: formData.get("clientId") ?? undefined,
    sigpacReference: formData.get("sigpacReference") ?? undefined,
    name: formData.get("name") ?? undefined,
    geometry: geometryProvided ? rawGeometry : undefined,
    areaHectares: nullableNumber(formData.get("areaHectares")),
    crop: nullableString(formData.get("crop")),
    cropVariety: nullableString(formData.get("cropVariety")),
    notes: nullableString(formData.get("notes")),
  };

  const parsed = updateParcelSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisa los campos resaltados", fieldErrors };
  }

  let updated;
  try {
    updated = await updateParcel(id, parsed.data);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Error de PostGIS: ${err.message}`
          : "Error al actualizar parcela",
    };
  }

  if (!updated) {
    return { ok: false, error: "No se pudo actualizar la parcela" };
  }

  await logAudit({
    userId: session.user.id,
    action: "parcel.updated",
    entityType: "parcel",
    entityId: id,
    before: {
      id: before.id,
      sigpacReference: before.sigpacReference,
      name: before.name,
      areaHectares: before.areaHectares,
      crop: before.crop,
    },
    after: {
      id: updated.id,
      sigpacReference: updated.sigpacReference,
      name: updated.name,
      areaHectares: updated.areaHectares,
      crop: updated.crop,
    },
  });

  revalidatePath("/dashboard/parcels");
  revalidatePath(`/dashboard/parcels/${id}`);

  return { ok: true, parcelId: id };
}
