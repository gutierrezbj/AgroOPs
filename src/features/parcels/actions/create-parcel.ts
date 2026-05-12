"use server";

/**
 * AgroOps — createParcelAction (HU-07)
 *
 * Alta de parcela con geometría PostGIS. El operador pega GeoJSON en v1;
 * MapLibre con dibujo interactivo llega en HU-14.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { createParcelSchema } from "../schemas";
import { createParcel } from "../services";
import type { CreateParcelState } from "./create-parcel.types";

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

export async function createParcelAction(
  _prev: CreateParcelState,
  formData: FormData,
): Promise<CreateParcelState> {
  const session = await auth();
  requireRole(session, ROLES.WRITERS);

  const raw = {
    clientId: formData.get("clientId"),
    sigpacReference: formData.get("sigpacReference"),
    name: formData.get("name"),
    geometry: formData.get("geometry"), // string GeoJSON pegado
    areaHectares: nullableNumber(formData.get("areaHectares")),
    crop: nullableString(formData.get("crop")),
    cropVariety: nullableString(formData.get("cropVariety")),
    notes: nullableString(formData.get("notes")),
  };

  const parsed = createParcelSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisa los campos resaltados", fieldErrors };
  }

  let parcel;
  try {
    parcel = await createParcel(parsed.data);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Error de PostGIS: ${err.message}`
          : "Error al insertar parcela",
    };
  }

  await logAudit({
    userId: session.user.id,
    action: "parcel.created",
    entityType: "parcel",
    entityId: parcel.id,
    // No volcamos toda la geometría al audit (puede ser un objeto enorme).
    // Sólo guardamos los identificadores clave + área calculada.
    after: {
      id: parcel.id,
      clientId: parcel.clientId,
      sigpacReference: parcel.sigpacReference,
      name: parcel.name,
      areaHectares: parcel.areaHectares,
      crop: parcel.crop,
    },
  });

  revalidatePath("/dashboard/parcels");

  return {
    ok: true,
    parcel: {
      id: parcel.id,
      name: parcel.name,
      sigpacReference: parcel.sigpacReference,
      areaHectares: parcel.areaHectares,
    },
  };
}
