/**
 * AgroOps — /dashboard/phytosanitary/[id] (HU-08)
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, ROLES } from "@/lib/rbac";
import { PhytoProductForm } from "@/features/phytosanitary/components/PhytoProductForm";
import { PhytoExpiryBadge } from "@/features/phytosanitary/components/PhytoExpiryBadge";
import { ArchivePhytoProductButton } from "@/features/phytosanitary/components/ArchivePhytoProductButton";
import { getPhytoProduct } from "@/features/phytosanitary/services";

export const metadata = { title: "AgroOps — Lote fitosanitario" };
export const dynamic = "force-dynamic";

interface EditPhytoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPhytoPage({ params }: EditPhytoPageProps) {
  const { id } = await params;
  const product = await getPhytoProduct(id);
  if (!product) notFound();

  const session = await auth();
  const canWrite = hasRole(session, ROLES.WRITERS);
  const canAdmin = hasRole(session, ROLES.ADMIN_ONLY);

  return (
    <main className="drone-edit">
      <header>
        <h1>
          {product.commercialName}{" "}
          <small>(lote {product.lotNumber})</small>
        </h1>
        <p>
          <PhytoExpiryBadge product={product} />
          {!product.active && (
            <>
              {" · "}
              <em>archivado</em>
            </>
          )}
          {" · "}
          <Link href="/dashboard/phytosanitary">← Volver al listado</Link>
        </p>
      </header>

      {canWrite ? (
        <PhytoProductForm mode="edit" product={product} />
      ) : (
        <section>
          <p>
            No tienes permisos para editar productos (requiere rol{" "}
            <code>admin</code> u <code>operario</code>).
          </p>
          <dl>
            <dt>Materia activa</dt>
            <dd>{product.activeIngredient}</dd>
            <dt>Caducidad</dt>
            <dd>{product.expiresAt}</dd>
          </dl>
        </section>
      )}

      {canAdmin && product.active && (
        <section className="drone-edit__danger">
          <h2>Zona de archivo</h2>
          <p>
            Archivar el lote lo marca inactivo. Las misiones históricas que lo
            usaron siguen referenciándolo.
          </p>
          <ArchivePhytoProductButton productId={product.id} />
        </section>
      )}
    </main>
  );
}
