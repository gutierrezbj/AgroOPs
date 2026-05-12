/**
 * AgroOps — AuditLogTable (HU-23)
 *
 * Tabla del audit log. Muestra fecha, usuario+rol, acción, entidad, IP y un
 * <details> colapsable con before/after/metadata JSON para forense detallado.
 */
import type { AuditLogEntry } from "../services";
import { formatAuditAction } from "../services";

interface AuditLogTableProps {
  entries: AuditLogEntry[];
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  if (entries.length === 0) {
    return (
      <p className="audit-log__empty">
        Sin entradas que coincidan con los filtros aplicados.
      </p>
    );
  }

  return (
    <div className="audit-log__scroll">
      <table className="audit-log__table">
        <thead>
          <tr>
            <th scope="col">Fecha · hora</th>
            <th scope="col">Usuario</th>
            <th scope="col">Rol</th>
            <th scope="col">Acción</th>
            <th scope="col">Entidad</th>
            <th scope="col">ID entidad</th>
            <th scope="col">IP</th>
            <th scope="col">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td className="mono">
                {e.createdAt.toLocaleString("es-ES")}
              </td>
              <td>{e.userName ?? e.userEmail ?? "—"}</td>
              <td>
                {e.userRole ? (
                  <code className="audit-log__role">{e.userRole}</code>
                ) : (
                  "—"
                )}
              </td>
              <td>
                <span className="audit-log__action">
                  {formatAuditAction(e.action)}
                </span>
                <br />
                <small className="mono">{e.action}</small>
              </td>
              <td>
                <span className="audit-log__entity">{e.entityType}</span>
              </td>
              <td className="mono audit-log__id">
                {e.entityId ?? "—"}
              </td>
              <td className="mono">{e.ipAddress ?? "—"}</td>
              <td>
                <DetailsCell entry={e} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailsCell({ entry }: { entry: AuditLogEntry }) {
  const hasBefore = entry.before != null;
  const hasAfter = entry.after != null;
  const hasMeta = entry.metadata != null;
  if (!hasBefore && !hasAfter && !hasMeta) {
    return <span className="audit-log__no-detail">—</span>;
  }
  return (
    <details className="audit-log__details">
      <summary>JSON ↓</summary>
      <div className="audit-log__json-block">
        {hasBefore && (
          <>
            <strong>before:</strong>
            <pre>{JSON.stringify(entry.before, null, 2)}</pre>
          </>
        )}
        {hasAfter && (
          <>
            <strong>after:</strong>
            <pre>{JSON.stringify(entry.after, null, 2)}</pre>
          </>
        )}
        {hasMeta && (
          <>
            <strong>metadata:</strong>
            <pre>{JSON.stringify(entry.metadata, null, 2)}</pre>
          </>
        )}
        {entry.userAgent && (
          <>
            <strong>userAgent:</strong>
            <pre>{entry.userAgent}</pre>
          </>
        )}
      </div>
    </details>
  );
}
