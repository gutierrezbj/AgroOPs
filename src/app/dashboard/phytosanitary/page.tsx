/**
 * AgroOps — /dashboard/phytosanitary (HU-08)
 */
import Link from "next/link";
import { listPhytoProducts } from "@/features/phytosanitary/services";
import { PhytoProductsTable } from "@/features/phytosanitary/components/PhytoProductsTable";

export const metadata = { title: "AgroOps — Catálogo fitosanitario" };
export const dynamic = "force-dynamic";

export default async function PhytoListPage() {
  const products = await listPhytoProducts();
  return (
    <main className="drones">
      <header>
        <h1>Catálogo fitosanitario</h1>
        <p>
          Lotes físicos de productos que aporta el cliente. AgroOps registra
          el lote usado en cada misión (ADR-4: no gestionamos stock ni
          transporte).
        </p>
        <p>
          <Link href="/dashboard/phytosanitary/new" className="btn-primary">
            + Nuevo lote
          </Link>
          {" · "}
          <Link href="/dashboard">Volver al dashboard</Link>
        </p>
      </header>
      <PhytoProductsTable products={products} />
    </main>
  );
}
