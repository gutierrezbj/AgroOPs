"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { phytoProductIdSchema } from "../schemas";
import { archivePhytoProduct, getPhytoProduct } from "../services";
import type { ArchivePhytoProductState } from "./archive-phyto-product.types";

export async function archivePhytoProductAction(
  _prev: ArchivePhytoProductState,
  formData: FormData,
): Promise<ArchivePhytoProductState> {
  const session = await auth();
  requireRole(session, ROLES.ADMIN_ONLY);

  const id = phytoProductIdSchema.parse(formData.get("id"));
  const before = await getPhytoProduct(id);
  if (!before) return { ok: false, error: "Producto no encontrado" };
  if (!before.active) return { ok: false, error: "El producto ya está inactivo" };

  const updated = await archivePhytoProduct(id);
  if (!updated) return { ok: false, error: "No se pudo archivar el producto" };

  await logAudit({
    userId: session.user.id,
    action: "phyto.archived",
    entityType: "phytosanitary_product",
    entityId: id,
    before,
    after: updated,
  });

  revalidatePath("/dashboard/phytosanitary");
  revalidatePath(`/dashboard/phytosanitary/${id}`);

  return { ok: true };
}
