/**
 * AgroOps — /api/field-notebook/pdf (HU-22)
 *
 * Genera y sirve el PDF tabular del cuaderno de campo PAC. Acepta los
 * mismos query params que `/dashboard/field-notebook` para que el botón
 * "Exportar PDF" mantenga los filtros activos.
 *
 * Auth gate: cualquier rol autenticado (el cuaderno es visible para viewer).
 * RBAC más estricto no aplica — el cuaderno es info legal que el dueño
 * de la operación quiere poder mostrar a un perito en campo.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateFieldNotebookPdf } from "@/features/field-notebook/pdf";
import { parseFiltersFromSearchParams } from "@/features/field-notebook/schemas";
import { listFieldNotebookEntries } from "@/features/field-notebook/services";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parseResult = parseFiltersFromSearchParams(searchParams);
  if (!parseResult.ok) {
    return new NextResponse(`Filtros inválidos: ${parseResult.error}`, {
      status: 400,
    });
  }

  const entries = await listFieldNotebookEntries(parseResult.filters);
  const pdfBytes = await generateFieldNotebookPdf(entries, {
    filters: parseResult.filters,
  });

  const filename = buildFilename(parseResult.filters);

  return new NextResponse(pdfBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}

function buildFilename(filters: {
  dateFrom?: string;
  dateTo?: string;
}): string {
  const parts = ["cuaderno-campo"];
  if (filters.dateFrom) parts.push(filters.dateFrom);
  if (filters.dateTo) parts.push(filters.dateTo);
  if (parts.length === 1)
    parts.push(new Date().toISOString().slice(0, 10));
  return `${parts.join("_")}.pdf`;
}
