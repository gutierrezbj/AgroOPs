/**
 * AgroOps — /api/albarans/[code]/pdf (HU-17)
 *
 * Sirve el PDF persistido en `albarans.pdfPath` para descarga / preview en
 * el navegador. Requiere sesión autenticada (cualquier rol que pueda ver
 * la misión asociada, lo cual cubre el middleware general).
 *
 * Si el albarán no existe o no tiene PDF generado → 404.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { readAlbaranPdf, getAlbaranByCode } from "@/features/albarans/services";

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { code } = await params;
  if (!/^ALB-\d{4}-\d{4}$/.test(code)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const albaran = await getAlbaranByCode(code);
  if (!albaran) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!albaran.pdfPath) {
    return new NextResponse(
      "PDF no generado todavía — usa el botón 'Generar PDF' en la vista del albarán",
      { status: 409 },
    );
  }

  const pdfBytes = await readAlbaranPdf(code);
  if (!pdfBytes) {
    return new NextResponse("PDF file missing en filesystem", { status: 500 });
  }

  return new NextResponse(pdfBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${code}.pdf"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
