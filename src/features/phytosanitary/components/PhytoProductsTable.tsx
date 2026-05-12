/**
 * AgroOps — PhytoProductsTable
 */
import Link from "next/link";
import type { PhytosanitaryProduct } from "@/db/schema/phytosanitary";
import { doseUnitLabels } from "../schemas";
import { PhytoExpiryBadge } from "./PhytoExpiryBadge";

function fmtDose(p: PhytosanitaryProduct): string {
  if (!p.recommendedDoseValue || !p.recommendedDoseUnit) return "—";
  const v = parseFloat(p.recommendedDoseValue).toFixed(3).replace(/\.?0+$/, "");
  return `${v} ${doseUnitLabels[p.recommendedDoseUnit]}`;
}

function fmtSafetyPeriod(value: string | null): string {
  if (value == null) return "—";
  return `${parseFloat(value).toFixed(1)} d`;
}

export function PhytoProductsTable({
  products,
}: {
  products: PhytosanitaryProduct[];
}) {
  if (products.length === 0) {
    return (
      <p className="drones-table__empty">
        No hay productos registrados.{" "}
        <Link href="/dashboard/phytosanitary/new">Añade el primer lote</Link>.
      </p>
    );
  }

  return (
    <table className="drones-table">
      <caption>Catálogo fitosanitario ({products.length} lotes)</caption>
      <thead>
        <tr>
          <th scope="col">Producto</th>
          <th scope="col">Materia activa</th>
          <th scope="col">Lote</th>
          <th scope="col">MAPA</th>
          <th scope="col">Form.</th>
          <th scope="col">Dosis rec.</th>
          <th scope="col">Plazo seg.</th>
          <th scope="col">Caducidad</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr key={p.id}>
            <td>
              <strong>{p.commercialName}</strong>
              {!p.active && (
                <>
                  <br />
                  <small>(inactivo)</small>
                </>
              )}
            </td>
            <td>
              <small>{p.activeIngredient}</small>
            </td>
            <td>
              <code>{p.lotNumber}</code>
            </td>
            <td>{p.mapaRegistration ?? "—"}</td>
            <td>{p.formulation ?? "—"}</td>
            <td>{fmtDose(p)}</td>
            <td>{fmtSafetyPeriod(p.safetyPeriodDays)}</td>
            <td>
              {p.expiresAt}
              <br />
              <PhytoExpiryBadge product={p} />
            </td>
            <td>
              <Link href={`/dashboard/phytosanitary/${p.id}`}>Editar</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
