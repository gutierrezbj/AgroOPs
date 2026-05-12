/**
 * AgroOps — PhytoExpiryBadge
 *
 * Badge que clasifica el lote según su fecha de caducidad.
 */
import type { PhytosanitaryProduct } from "@/db/schema/phytosanitary";
import { evaluateExpiry } from "../services";

export function PhytoExpiryBadge({
  product,
}: {
  product: PhytosanitaryProduct;
}) {
  const { severity, daysToExpiry } = evaluateExpiry(product);
  const label =
    severity === "expired"
      ? `Vencido hace ${Math.abs(daysToExpiry)}d`
      : severity === "warning"
        ? `Vence en ${daysToExpiry}d`
        : `OK (${daysToExpiry}d)`;
  return (
    <span
      data-status={severity}
      className={`drone-status drone-status--${
        severity === "ok"
          ? "active"
          : severity === "expired"
            ? "retired"
            : "maintenance"
      }`}
    >
      {label}
    </span>
  );
}
