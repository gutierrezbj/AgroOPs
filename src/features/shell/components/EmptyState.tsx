/**
 * AgroOps — EmptyState (Sprint 5 Distinctiveness Audit)
 *
 * Componente reutilizable para listados vacíos. Copy con la voz del
 * producto (no "No data" genérico). Soporta acción primaria opcional
 * (típicamente "Crear primer X") para que el usuario tenga next-step
 * obvio sin tener que cazar el botón.
 *
 * Ejemplo:
 * ```tsx
 * <EmptyState
 *   icon="📋"
 *   title="No hay misiones registradas"
 *   description="Cuando crees una misión aérea aparecerá aquí con su estado y albarán."
 *   action={{ href: "/dashboard/missions/new", label: "Crear primera misión" }}
 * />
 * ```
 */
import Link from "next/link";

interface EmptyStateAction {
  href?: string;
  label: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  /** Emoji o icono unicode (single char). Decorativo, aria-hidden. */
  icon?: string;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  /** Variante visual: default | compact (menos padding, para sub-listados). */
  variant?: "default" | "compact";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
}: EmptyStateProps) {
  return (
    <div
      className={`empty-state empty-state--${variant}`}
      role="status"
    >
      {icon && (
        <span className="empty-state__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <h2 className="empty-state__title">{title}</h2>
      {description && (
        <p className="empty-state__description">{description}</p>
      )}
      {action && (
        <div className="empty-state__action">
          {action.href ? (
            <Link href={action.href} className="empty-state__button">
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="empty-state__button"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
