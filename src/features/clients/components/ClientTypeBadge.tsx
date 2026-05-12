/**
 * AgroOps — ClientTypeBadge
 *
 * Badge neutro para el tipo de cliente. Sin paleta de marca.
 */
import type { ClientType } from "@/db/schema/clients";
import { clientTypeLabels } from "../schemas";

export function ClientTypeBadge({ type }: { type: ClientType }) {
  return (
    <span className="drone-status drone-status--active" data-client-type={type}>
      {clientTypeLabels[type]}
    </span>
  );
}
