"use server";

/**
 * AgroOps — generateAlbaranPdfAction (HU-16 + HU-17)
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { albaranIdSchema } from "../schemas";
import { generateAlbaranPdf, getAlbaran } from "../services";
import type { GeneratePdfState } from "./generate-pdf.types";

export async function generateAlbaranPdfAction(
  _prev: GeneratePdfState,
  formData: FormData,
): Promise<GeneratePdfState> {
  const session = await auth();
  requireRole(session, ROLES.PILOT_OPERATIONS);

  const id = albaranIdSchema.parse(formData.get("albaranId"));
  const before = await getAlbaran(id);
  if (!before) return { ok: false, error: "Albarán no encontrado" };
  if (!before.signatureImageBase64) {
    return {
      ok: false,
      error: "No hay firma capturada — no se puede generar PDF",
    };
  }

  let result;
  try {
    result = await generateAlbaranPdf(id);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Error generando PDF: ${err.message}`
          : "Error desconocido",
    };
  }

  await logAudit({
    userId: session.user.id,
    action: "albaran.pdf.generated",
    entityType: "albaran",
    entityId: id,
    after: {
      pdfPath: result.pdfPath,
      pdfHash: result.pdfHash,
    },
  });

  revalidatePath(`/dashboard/missions/${before.missionId}`);
  revalidatePath(`/dashboard/missions/${before.missionId}/albaran`);

  return { ok: true, pdfHash: result.pdfHash };
}
