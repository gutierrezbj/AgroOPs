/**
 * AgroOps — /dashboard/field-notebook (HU-21 + HU-22)
 *
 * Cuaderno de campo PAC: vista derivada de misiones completed/invoiced con
 * sus parcelas + productos + dosis + operador + equipo. Filtros por rango
 * de fechas, cliente, parcela y cultivo. Export PDF a `/api/field-notebook/pdf`.
 *
 * Server component. Sólo lectura — el cuaderno es histórico, no se edita
 * desde aquí (las correcciones se hacen sobre la misión o el albarán).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CROP_OPTIONS } from "@/lib/constants";
import { listClients } from "@/features/clients/services";
import { FieldNotebookTable } from "@/features/field-notebook/components/FieldNotebookTable";
import {
  listFieldNotebookEntries,
  summarizeFieldNotebook,
} from "@/features/field-notebook/services";
import { parseFiltersFromSearchParams } from "@/features/field-notebook/schemas";

export const metadata = { title: "Cuaderno de campo" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    clientId?: string;
    parcelId?: string;
    crop?: string;
  }>;
}

export default async function FieldNotebookPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?next=/dashboard/field-notebook");
  }

  const raw = await searchParams;
  const parseResult = parseFiltersFromSearchParams(raw);

  if (!parseResult.ok) {
    return (
      <main className="field-notebook-page">
        <header>
          <h1>Cuaderno de campo</h1>
          <p role="alert" className="field-notebook__error">
            Filtros inválidos: {parseResult.error}
          </p>
          <p>
            <Link href="/dashboard/field-notebook">← Limpiar filtros</Link>
          </p>
        </header>
      </main>
    );
  }

  const filters = parseResult.filters;
  const [entries, clients] = await Promise.all([
    listFieldNotebookEntries(filters),
    listClients(),
  ]);
  const summary = summarizeFieldNotebook(entries);

  // Para construir el link al PDF mantenemos los mismos query params
  const pdfHref = buildPdfHref(filters);

  return (
    <main className="field-notebook-page">
      <header className="field-notebook__header">
        <div>
          <h1>Cuaderno de campo</h1>
          <p className="field-notebook__subtitle">
            Registro PAC de aplicaciones fitosanitarias. Misiones en estado{" "}
            <code>completed</code> o <code>invoiced</code> con sus parcelas
            SIGPAC, productos, dosis, operador y equipo.
          </p>
        </div>
        <div className="field-notebook__actions-top">
          <Link href={pdfHref} className="field-notebook__pdf-btn">
            ↓ Exportar PDF PAC
          </Link>
          <Link href="/dashboard" className="field-notebook__back">
            ← Dashboard
          </Link>
        </div>
      </header>

      <section className="field-notebook__summary" aria-label="Resumen agregado">
        <dl>
          <div>
            <dt>Aplicaciones</dt>
            <dd className="mono">{summary.entryCount}</dd>
          </div>
          <div>
            <dt>Misiones</dt>
            <dd className="mono">{summary.missionCount}</dd>
          </div>
          <div>
            <dt>Parcelas</dt>
            <dd className="mono">{summary.parcelCount}</dd>
          </div>
          <div>
            <dt>Área total tratada</dt>
            <dd className="mono">{summary.totalAreaHa.toFixed(4)} ha</dd>
          </div>
          <div>
            <dt>Producto líquido</dt>
            <dd className="mono">
              {summary.totalProductLitres.toFixed(2)} L (estimado)
            </dd>
          </div>
          {summary.dateRangeFrom && summary.dateRangeTo && (
            <div>
              <dt>Rango</dt>
              <dd className="mono">
                {new Date(summary.dateRangeFrom).toLocaleDateString("es-ES")} →{" "}
                {new Date(summary.dateRangeTo).toLocaleDateString("es-ES")}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="field-notebook__filters" aria-label="Filtros">
        <form method="get" className="field-notebook__filter-form">
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
            Cliente
            <select name="clientId" defaultValue={filters.clientId ?? ""}>
              <option value="">Todos</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cultivo
            <select name="crop" defaultValue={filters.crop ?? ""}>
              <option value="">Todos</option>
              {/* Si el filtro tiene un valor que NO está en CROP_OPTIONS
                  (ej. cultivo legacy guardado en parcels), lo preservamos
                  como opción dinámica para que el usuario pueda quitarlo. */}
              {filters.crop &&
                !CROP_OPTIONS.some((o) => o.value === filters.crop) && (
                  <option value={filters.crop}>
                    {filters.crop} (actual)
                  </option>
                )}
              {CROP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Aplicar</button>
          {(filters.dateFrom ||
            filters.dateTo ||
            filters.clientId ||
            filters.parcelId ||
            filters.crop) && (
            <Link
              href="/dashboard/field-notebook"
              className="field-notebook__clear"
            >
              Limpiar
            </Link>
          )}
        </form>
      </section>

      <FieldNotebookTable entries={entries} />

      <footer className="field-notebook__footer">
        <small>
          Sólo aplicaciones en misiones <code>completed</code> /{" "}
          <code>invoiced</code>. La PAC exige documentar producto, materia
          activa, lote, dosis, fecha, parcela SIGPAC, operador (ROPO) y
          equipo. Albaranes vinculados con SHA-256 del PDF firmado para
          defensibilidad ante perito.
        </small>
      </footer>
    </main>
  );
}

function buildPdfHref(filters: {
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
  parcelId?: string;
  crop?: string;
}): string {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.parcelId) params.set("parcelId", filters.parcelId);
  if (filters.crop) params.set("crop", filters.crop);
  const qs = params.toString();
  return `/api/field-notebook/pdf${qs ? `?${qs}` : ""}`;
}
