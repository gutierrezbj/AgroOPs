/**
 * AgroOps — field-notebook PDF generator (HU-22)
 *
 * Genera un PDF tabular del cuaderno de campo PAC. Formato A4 horizontal
 * (landscape) para acomodar las 15 columnas legales. Una fila por
 * aplicación-de-producto-en-parcela.
 *
 * v1.0 — Formato agregado simple, legible y defensible ante perito o
 * inspección administrativa. La columnas siguen la lista de campos
 * exigidos por el Real Decreto 1311/2012 (uso sostenible de productos
 * fitosanitarios). En v1.1 evaluaremos el formato exacto del Registro
 * Oficial MAPA si la PAC 2027 lo exige normativamente.
 *
 * NO persiste el PDF en disco (a diferencia del albarán). El cuaderno se
 * regenera bajo demanda con los filtros activos; cada export es un snapshot
 * en el tiempo. Si se necesitara archivado, se persistiría en HU-22.1.
 */
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import {
  formatDose,
  formatTotalAmount,
  summarizeFieldNotebook,
  type FieldNotebookEntry,
  type FieldNotebookSummary,
} from "./services";
import type { FieldNotebookFilters } from "./schemas";

const PAGE_WIDTH = 842; // A4 landscape
const PAGE_HEIGHT = 595;
const MARGIN_X = 24;
const MARGIN_TOP = 24;
const MARGIN_BOTTOM = 32;

const HEADER_HEIGHT = 60;
const FOOTER_HEIGHT = 24;

// Identity v0.2 — FitoLink → AgroM → AgroOps. Paleta espejo del dashboard
// productivo (no del paper editorial earth-50/100 que se descartó tras
// feedback 'el cremita NO').
//
// pdf-lib usa rgb(r/255, g/255, b/255) en floats 0-1.
const COLOR_TEXT = rgb(24 / 255, 35 / 255, 15 / 255); // #18230f ink (brand-900)
const COLOR_MUTED = rgb(107 / 255, 114 / 255, 128 / 255); // #6b7280 muted (gray-500)
const COLOR_LINE = rgb(229 / 255, 231 / 255, 235 / 255); // #e5e7eb gray-200 (hairline neutral, no dorado earth-300)
const COLOR_HEADER_BG = rgb(70 / 255, 99 / 255, 46 / 255); // #46632e deep (brand-600)
const COLOR_HEADER_TEXT = rgb(255 / 255, 255 / 255, 255 / 255); // white sobre brand-600
const COLOR_ZEBRA = rgb(250 / 255, 253 / 255, 247 / 255); // #fafdf7 surface (= body bg web)

interface Column {
  key: keyof FieldNotebookEntry | "compositeSigpac" | "compositeProduct" | "compositeOperator" | "compositeEquipment";
  label: string;
  width: number;
  numeric?: boolean;
  /** Función custom para extraer el valor del entry. Si no se pasa, usa entry[key]. */
  value?: (e: FieldNotebookEntry) => string;
}

// Anchos calibrados para A4 landscape (842pt) menos margins (2 * 24pt = 48pt)
// → 794pt usable. Suma de la tabla DEBE ser ≤ 794 para no desbordar.
// Reparto v0.2 (suma exacta 794):
//   46+60+68+74+50+38+88+50+44+48+48+70+58+52 = 794
const COLUMNS: Column[] = [
  {
    key: "appliedAt",
    label: "Fecha",
    width: 46,
    value: (e) => new Date(e.appliedAt).toLocaleDateString("es-ES"),
  },
  { key: "missionCode", label: "Misión", width: 60 },
  {
    key: "clientName",
    label: "Cliente",
    width: 68,
    value: (e) => `${e.clientName}\n${e.clientTaxId}`,
  },
  {
    key: "compositeSigpac",
    label: "Parcela SIGPAC",
    width: 74,
    value: (e) => `${e.parcelName}\n${e.sigpacReference}`,
  },
  {
    key: "crop",
    label: "Cultivo",
    width: 50,
    value: (e) => {
      // Cultivo en línea 1, variedad en línea 2 si existe (más legible
      // que '(Marcona)' inline porque trunca menos)
      const lines = [e.crop ?? "—"];
      if (e.cropVariety) lines.push(e.cropVariety);
      return lines.join("\n");
    },
  },
  {
    key: "areaTreatedHa",
    label: "Área ha",
    width: 38,
    numeric: true,
    value: (e) => e.areaTreatedHa.toFixed(2),
  },
  {
    key: "compositeProduct",
    label: "Producto / Materia activa",
    width: 88,
    value: (e) => `${e.productCommercialName}\n${e.productActiveIngredient}`,
  },
  { key: "lotUsed", label: "Lote", width: 50 },
  {
    key: "productMapaRegistration",
    label: "Reg. MAPA",
    width: 44,
    value: (e) => e.productMapaRegistration ?? "—",
  },
  {
    key: "appliedDoseValue",
    label: "Dosis",
    width: 48,
    numeric: true,
    value: (e) => formatDose(e.appliedDoseValue, e.appliedDoseUnit),
  },
  {
    key: "totalAmountUsed",
    label: "Volumen total",
    width: 48,
    numeric: true,
    value: (e) => formatTotalAmount(e.totalAmountUsed, e.totalAmountUnit),
  },
  {
    key: "compositeOperator",
    label: "Operador / ROPO",
    width: 70,
    value: (e) => {
      const lines = [e.pilotName ?? "—"];
      if (e.pilotRopoNumber) lines.push(`ROPO ${e.pilotRopoNumber}`);
      return lines.join("\n");
    },
  },
  {
    key: "compositeEquipment",
    label: "Equipo",
    width: 58,
    value: (e) => {
      const lines = [e.droneModel ?? "—"];
      if (e.droneSerialNumber) lines.push(`SN ${e.droneSerialNumber}`);
      return lines.join("\n");
    },
  },
  {
    key: "albaranCode",
    label: "Albarán",
    width: 52,
    value: (e) => e.albaranCode ?? "—",
  },
];

const TOTAL_TABLE_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);

interface PdfOptions {
  filters: FieldNotebookFilters;
}

export async function generateFieldNotebookPdf(
  entries: FieldNotebookEntry[],
  options: PdfOptions,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdf.embedFont(StandardFonts.Courier);

  const summary = summarizeFieldNotebook(entries);
  const generatedAt = new Date();

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;
  let pageNumber = 1;

  // Header en la primera página
  y = drawDocumentHeader(page, font, fontBold, fontMono, {
    summary,
    filters: options.filters,
    generatedAt,
    yStart: y,
  });

  y = drawTableHeader(page, fontBold, y);

  // Body
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const rowHeight = computeRowHeight(entry);
    if (y - rowHeight < MARGIN_BOTTOM + FOOTER_HEIGHT) {
      // Nueva página
      drawPageFooter(page, font, fontMono, pageNumber, generatedAt);
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pageNumber += 1;
      y = PAGE_HEIGHT - MARGIN_TOP;
      y = drawTableHeader(page, fontBold, y);
    }
    drawRow(page, font, fontMono, entry, y, i % 2 === 1);
    y -= rowHeight;
  }

  if (entries.length === 0) {
    page.drawText(
      "Sin aplicaciones registradas en los filtros seleccionados.",
      {
        x: MARGIN_X,
        y: y - 24,
        font,
        size: 10,
        color: COLOR_MUTED,
      },
    );
  }

  drawPageFooter(page, font, fontMono, pageNumber, generatedAt);

  return pdf.save();
}

function drawDocumentHeader(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont,
  ctx: {
    summary: FieldNotebookSummary;
    filters: FieldNotebookFilters;
    generatedAt: Date;
    yStart: number;
  },
): number {
  const { summary, filters, generatedAt, yStart } = ctx;
  let y = yStart;

  // Título
  page.drawText("Cuaderno de campo · AgroOps", {
    x: MARGIN_X,
    y: y - 14,
    font: fontBold,
    size: 16,
    color: COLOR_HEADER_BG,
  });
  y -= 20;

  page.drawText(
    "Registro PAC de aplicaciones fitosanitarias aéreas con dron — Real Decreto 1311/2012",
    {
      x: MARGIN_X,
      y: y - 12,
      font,
      size: 9,
      color: COLOR_MUTED,
    },
  );
  y -= 18;

  // Filtros aplicados (línea muted)
  const filterParts: string[] = [];
  if (filters.dateFrom)
    filterParts.push(`Desde ${new Date(filters.dateFrom).toLocaleDateString("es-ES")}`);
  if (filters.dateTo)
    filterParts.push(`Hasta ${new Date(filters.dateTo).toLocaleDateString("es-ES")}`);
  if (filters.clientId) filterParts.push(`Cliente ${filters.clientId.slice(0, 8)}…`);
  if (filters.parcelId) filterParts.push(`Parcela ${filters.parcelId.slice(0, 8)}…`);
  if (filters.crop) filterParts.push(`Cultivo "${filters.crop}"`);
  if (filterParts.length === 0) filterParts.push("Sin filtros (toda la operación)");

  page.drawText(`Filtros: ${filterParts.join(" · ")}`, {
    x: MARGIN_X,
    y: y - 10,
    font,
    size: 8.5,
    color: COLOR_MUTED,
  });
  y -= 16;

  // Resumen agregado en mono
  const summaryLine = `${summary.entryCount} aplicaciones · ${summary.missionCount} misiones · ${summary.parcelCount} parcelas · ${summary.totalAreaHa.toFixed(2)} ha tratadas · ${summary.totalProductLitres.toFixed(2)} L producto líquido (estimado)`;
  page.drawText(summaryLine, {
    x: MARGIN_X,
    y: y - 10,
    font: fontMono,
    size: 8.5,
    color: COLOR_TEXT,
  });
  y -= 14;

  // Generación timestamp
  page.drawText(`Generado: ${generatedAt.toLocaleString("es-ES")}`, {
    x: MARGIN_X,
    y: y - 9,
    font,
    size: 8,
    color: COLOR_MUTED,
  });
  y -= 16;

  return y;
}

function drawTableHeader(
  page: PDFPage,
  fontBold: PDFFont,
  yStart: number,
): number {
  const y = yStart - HEADER_HEIGHT / 4 - 4;
  const headerHeight = 18;
  // Banda deep de fondo
  page.drawRectangle({
    x: MARGIN_X,
    y: y - headerHeight + 4,
    width: TOTAL_TABLE_WIDTH,
    height: headerHeight,
    color: COLOR_HEADER_BG,
  });

  let x = MARGIN_X;
  for (const col of COLUMNS) {
    page.drawText(col.label, {
      x: x + 3,
      y: y - 8,
      font: fontBold,
      size: 7.5,
      color: COLOR_HEADER_TEXT,
    });
    x += col.width;
  }
  return y - headerHeight;
}

function computeRowHeight(entry: FieldNotebookEntry): number {
  // Calcula la altura de fila contando las líneas más altas
  let maxLines = 1;
  for (const col of COLUMNS) {
    const value = col.value ? col.value(entry) : String(entry[col.key as keyof FieldNotebookEntry] ?? "—");
    const lines = value.split("\n").length;
    if (lines > maxLines) maxLines = lines;
  }
  // base 11 (font 6.5 + breathing) + extra por línea adicional + padding inferior
  return 11 + (maxLines - 1) * 8.5 + 3;
}

function drawRow(
  page: PDFPage,
  font: PDFFont,
  fontMono: PDFFont,
  entry: FieldNotebookEntry,
  yTop: number,
  zebra: boolean,
): void {
  const rowHeight = computeRowHeight(entry);

  if (zebra) {
    page.drawRectangle({
      x: MARGIN_X,
      y: yTop - rowHeight,
      width: TOTAL_TABLE_WIDTH,
      height: rowHeight,
      color: COLOR_ZEBRA,
    });
  }

  // Línea inferior fina
  page.drawLine({
    start: { x: MARGIN_X, y: yTop - rowHeight },
    end: { x: MARGIN_X + TOTAL_TABLE_WIDTH, y: yTop - rowHeight },
    thickness: 0.3,
    color: COLOR_LINE,
  });

  let x = MARGIN_X;
  for (const col of COLUMNS) {
    const value = col.value
      ? col.value(entry)
      : String(entry[col.key as keyof FieldNotebookEntry] ?? "—");
    const lines = value.split("\n");
    const isMono =
      col.key === "missionCode" ||
      col.key === "lotUsed" ||
      col.key === "albaranCode" ||
      col.key === "productMapaRegistration" ||
      col.numeric === true ||
      col.key === "compositeSigpac";
    const lineFont = isMono ? fontMono : font;
    // Font-size 6.5 (era 7) — gana ~7% más caracteres antes de truncar.
    // Padding interno reducido a 2pt (era 3) — gana 2pt más por columna.
    const fontSize = 6.5;
    const cellPadding = 2;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const truncated = truncateToWidth(line, lineFont, col.width - cellPadding * 2, fontSize);
      page.drawText(truncated, {
        x:
          x +
          cellPadding +
          (col.numeric
            ? col.width -
              cellPadding * 2 -
              lineFont.widthOfTextAtSize(truncated, fontSize)
            : 0),
        y: yTop - 8.5 - i * 8.5,
        font: lineFont,
        size: fontSize,
        color: i === 0 ? COLOR_TEXT : COLOR_MUTED,
      });
    }
    x += col.width;
  }
}

function truncateToWidth(
  text: string,
  font: PDFFont,
  maxWidth: number,
  fontSize = 6.5,
): string {
  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) return text;
  let result = text;
  while (
    result.length > 1 &&
    font.widthOfTextAtSize(`${result}…`, fontSize) > maxWidth
  ) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function drawPageFooter(
  page: PDFPage,
  font: PDFFont,
  fontMono: PDFFont,
  pageNumber: number,
  generatedAt: Date,
): void {
  const y = MARGIN_BOTTOM - 4;
  page.drawLine({
    start: { x: MARGIN_X, y: MARGIN_BOTTOM + 8 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: MARGIN_BOTTOM + 8 },
    thickness: 0.3,
    color: COLOR_LINE,
  });
  page.drawText("AgroOps · sistema de operaciones UAS aplicación fitosanitaria", {
    x: MARGIN_X,
    y,
    font,
    size: 7.5,
    color: COLOR_MUTED,
  });
  page.drawText(
    `Página ${pageNumber} · Generado ${generatedAt.toLocaleString("es-ES")}`,
    {
      x: PAGE_WIDTH - MARGIN_X - 180,
      y,
      font: fontMono,
      size: 7.5,
      color: COLOR_MUTED,
    },
  );
}
