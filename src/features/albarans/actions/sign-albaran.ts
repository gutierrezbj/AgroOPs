"use server";

/**
 * AgroOps — signAlbaranAction (HU-15)
 *
 * Captura firma del cliente y crea (o reemplaza) el albarán de la misión.
 * RBAC: PILOT_OPERATIONS (admin + piloto). El piloto en campo es quien
 * normalmente captura la firma en tablet; admin puede sobrescribir.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { signAlbaranSchema } from "../schemas";
import { createOrSignAlbaran } from "../services";
import type { SignAlbaranState } from "./sign-albaran.types";

function nullableString(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function signAlbaranAction(
  _prev: SignAlbaranState,
  formData: FormData,
): Promise<SignAlbaranState> {
  const session = await auth();
  requireRole(session, ROLES.PILOT_OPERATIONS);

  const raw = {
    missionId: formData.get("missionId"),
    signerFullName: formData.get("signerFullName"),
    signerNif: formData.get("signerNif"),
    signatureImageBase64: formData.get("signatureImageBase64"),
    notes: nullableString(formData.get("notes")),
  };

  const parsed = signAlbaranSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisa los campos del albarán", fieldErrors };
  }

  let albaran;
  try {
    albaran = await createOrSignAlbaran(parsed.data);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Error guardando firma: ${err.message}`
          : "Error desconocido",
    };
  }

  await logAudit({
    userId: session.user.id,
    action: "albaran.signed",
    entityType: "albaran",
    entityId: albaran.id,
    after: {
      id: albaran.id,
      code: albaran.code,
      missionId: albaran.missionId,
      signerFullName: albaran.signerFullName,
      signerNif: albaran.signerNif,
      // No volcamos el PNG completo al audit log (kilobytes).
      signatureCaptured: true,
    },
  });

  revalidatePath(`/dashboard/missions/${albaran.missionId}`);
  revalidatePath(`/dashboard/missions/${albaran.missionId}/albaran`);

  return {
    ok: true,
    albaran: { id: albaran.id, code: albaran.code },
  };
}
