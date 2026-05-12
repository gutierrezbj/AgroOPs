/**
 * AgroOps — /dashboard/audit-log (HU-23)
 *
 * Vista del audit log. Solo `admin`. Útil para investigar:
 * - Qué pasó con una misión concreta (filtrar por entityId).
 * - Quién hizo qué en las últimas 24h (filtrar dateFrom).
 * - Todas las facturas disparadas hoy (action="mission.invoice_dispatched").
 *
 * El audit log es la fuente de verdad para auditorías PAC, peritos y
 * disputas con clientes. Append-only por diseño (sin UPDATE/DELETE expuestos).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLES, hasRole } from "@/lib/rbac";
import { AuditLogTable } from "@/features/audit/components/AuditLogTable";
import { parseAuditFiltersFromSearchParams } from "@/features/audit/schemas";
import {
  KNOWN_AUDIT_ACTIONS,
  KNOWN_ENTITY_TYPES,
  listAuditLog,
} from "@/features/audit/services";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    actionPrefix?: string;
    limit?: string;
  }>;
}

export default async function AuditLogPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?next=/dashboard/audit-log");
  }
  if (!hasRole(session, ROLES.ADMIN_ONLY)) {
    return (
      <main className="audit-log-page">
        <header>
          <h1>Audit log</h1>
          <p role="alert" className="audit-log__error">
            Acceso restringido a rol <code>admin</code>. Tu rol actual:{" "}
            <code>{session.user.role}</code>.
          </p>
          <p>
            <Link href="/dashboard">← Volver al dashboard</Link>
          </p>
        </header>
      </main>
    );
  }

  const raw = await searchParams;
  const parseResult = parseAuditFiltersFromSearchParams(raw);

  if (!parseResult.ok) {
    return (
      <main className="audit-log-page">
        <header>
          <h1>Audit log</h1>
          <p role="alert" className="audit-log__error">
            Filtros inválidos: {parseResult.error}
          </p>
          <p>
            <Link href="/dashboard/audit-log">← Limpiar filtros</Link>
          </p>
        </header>
      </main>
    );
  }

  const filters = parseResult.filters;
  const entries = await listAuditLog(filters);

  return (
    <main className="audit-log-page">
      <header className="audit-log__header">
        <div>
          <h1>Audit log</h1>
          <p className="audit-log__subtitle">
            Trazabilidad append-only de mutaciones críticas (misiones,
            albaranes, facturas, fito). Mostrando <strong>{entries.length}</strong>{" "}
            entradas con los filtros aplicados (límite{" "}
            <code>{filters.limit}</code>).
          </p>
        </div>
        <Link href="/dashboard" className="audit-log__back">
          ← Dashboard
        </Link>
      </header>

      <section className="audit-log__filters" aria-label="Filtros">
        <form method="get" className="audit-log__filter-form">
          <label>
            Desde
            <input
              type="date"
              name="dateFrom"
              defaultValue={filters.dateFrom ?? ""}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              name="dateTo"
              defaultValue={filters.dateTo ?? ""}
            />
          </label>
          <label>
            Entidad
            <select name="entityType" defaultValue={filters.entityType ?? ""}>
              <option value="">Todas</option>
              {KNOWN_ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Acción
            <select name="action" defaultValue={filters.action ?? ""}>
              <option value="">Todas</option>
              {KNOWN_AUDIT_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prefijo
            <input
              type="text"
              name="actionPrefix"
              defaultValue={filters.actionPrefix ?? ""}
              placeholder="mission."
            />
          </label>
          <label>
            Límite
            <input
              type="number"
              name="limit"
              defaultValue={filters.limit}
              min={1}
              max={500}
            />
          </label>
          <button type="submit">Aplicar</button>
          {(filters.dateFrom ||
            filters.dateTo ||
            filters.userId ||
            filters.entityType ||
            filters.entityId ||
            filters.action ||
            filters.actionPrefix) && (
            <Link href="/dashboard/audit-log" className="audit-log__clear">
              Limpiar
            </Link>
          )}
        </form>
      </section>

      <AuditLogTable entries={entries} />

      <footer className="audit-log__footer">
        <small>
          Append-only por diseño — el audit log no permite UPDATE/DELETE
          desde la UI ni desde server actions. Solo se inserta vía{" "}
          <code>logAudit()</code>. Las queries de seguridad/forense pueden
          hacerse directas en SQL <code>SELECT * FROM audit_log ORDER BY
          created_at DESC</code>.
        </small>
      </footer>
    </main>
  );
}
