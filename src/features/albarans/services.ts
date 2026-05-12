/**
 * AgroOps — albarans services (HU-15 + HU-16 + HU-17)
 *
 * - createOrSignAlbaran: upsert (1:1 con mission). Genera código con
 *   nextAlbaranCode si es nuevo.
 * - getAlbaran / getAlbaranByMission.
 * - generateAlbaranPdf: arma el PDF con pdf-lib desde mission + parcels +
 *   mission_phyto + signature, calcula SHA-256, persiste en filesystem
 *   local y actualiza `pdfPath` + `pdfHash` en DB.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/db";
import { albarans, type Albaran, type NewAlbaran } from "@/db/schema/albarans";
import { missions } from "@/db/schema/missions";
import { clients } from "@/db/schema/clients";
import { drones } from "@/db/schema/drones";
import { pilots } from "@/db/schema/pilots";
import { parcels } from "@/db/schema/parcels";
import { missionParcels } from "@/db/schema/mission-parcels";
import { missionPhyto } from "@/db/schema/mission-phyto";
import { phytosanitaryProducts } from "@/db/schema/phytosanitary";
import { nextAlbaranCode } from "@/lib/mission-codes";
import type { SignAlbaranInput } from "./schemas";

/**
 * Raíz del storage local de PDFs. En PROD esto debe ser un volumen Docker
 * persistente; en dev local viene a `./storage/albarans` del workdir.
 */
const STORAGE_ROOT = resolve(
  process.cwd(),
  process.env.ALBARANS_STORAGE_DIR ?? "./storage/albarans",
);

export async function getAlbaran(id: string): Promise<Albaran | null> {
  const a = await db.query.albarans.findFirst({
    where: eq(albarans.id, id),
  });
  return a ?? null;
}

export async function getAlbaranByMission(
  missionId: string,
): Promise<Albaran | null> {
  const a = await db.query.albarans.findFirst({
    where: eq(albarans.missionId, missionId),
  });
  return a ?? null;
}

export async function getAlbaranByCode(code: string): Promise<Albaran | null> {
  const a = await db.query.albarans.findFirst({
    where: eq(albarans.code, code),
  });
  return a ?? null;
}

/**
 * Upsert albarán con firma. Si ya existe albarán para la misión, actualiza
 * la firma (puede pasar si el cliente firma de nuevo tras corrección).
 * Si no existe, crea uno nuevo con código autogenerado.
 *
 * El PDF NO se genera aquí — eso es `generateAlbaranPdf`, que el operador
 * dispara explícitamente desde la UI (HU-16). Eso permite re-firmar sin
 * regenerar PDF al instante, y separa la responsabilidad firma vs PDF.
 */
export async function createOrSignAlbaran(
  input: SignAlbaranInput,
): Promise<Albaran> {
  const existing = await getAlbaranByMission(input.missionId);
  if (existing) {
    const [updated] = await db
      .update(albarans)
      .set({
        signedAt: new Date(),
        signerFullName: input.signerFullName,
        signerNif: input.signerNif,
        signatureImageBase64: input.signatureImageBase64,
        notes: input.notes ?? existing.notes,
        // Si había PDF anterior, lo invalidamos: la firma cambió.
        pdfPath: null,
        pdfHash: null,
      })
      .where(eq(albarans.id, existing.id))
      .returning();
    if (!updated) throw new Error("createOrSignAlbaran: update no devolvió fila");
    return updated;
  }

  const code = await nextAlbaranCode();
  const values: NewAlbaran = {
    missionId: input.missionId,
    code,
    signedAt: new Date(),
    signerFullName: input.signerFullName,
    signerNif: input.signerNif,
    signatureImageBase64: input.signatureImageBase64,
    notes: input.notes ?? null,
  };
  const [created] = await db.insert(albarans).values(values).returning();
  if (!created) throw new Error("createOrSignAlbaran: insert no devolvió fila");
  return created;
}

// ──────────────────────────────────────────────────────────────────────
// HU-16 + HU-17: PDF generation + storage
// ──────────────────────────────────────────────────────────────────────

export interface AlbaranContext {
  albaran: Albaran;
  mission: typeof missions.$inferSelect;
  client: typeof clients.$inferSelect;
  drone: typeof drones.$inferSelect | null;
  pilot: typeof pilots.$inferSelect | null;
  parcels: Array<{
    parcel: typeof parcels.$inferSelect;
    areaTreatedHa: string | null;
  }>;
  phyto: Array<{
    product: typeof phytosanitaryProducts.$inferSelect;
    line: typeof missionPhyto.$inferSelect;
  }>;
}

async function loadAlbaranContext(
  albaranId: string,
): Promise<AlbaranContext | null> {
  const albaran = await getAlbaran(albaranId);
  if (!albaran) return null;

  const mission = await db.query.missions.findFirst({
    where: eq(missions.id, albaran.missionId),
  });
  if (!mission) return null;

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, mission.clientId))
    .limit(1);
  if (!client) return null;

  const drone = mission.droneId
    ? (
        await db
          .select()
          .from(drones)
          .where(eq(drones.id, mission.droneId))
          .limit(1)
      )[0] ?? null
    : null;
  const pilot = mission.pilotId
    ? (
        await db
          .select()
          .from(pilots)
          .where(eq(pilots.id, mission.pilotId))
          .limit(1)
      )[0] ?? null
    : null;

  const parcelRows = await db
    .select({
      parcel: parcels,
      areaTreatedHa: missionParcels.areaTreatedHa,
    })
    .from(missionParcels)
    .leftJoin(parcels, eq(missionParcels.parcelId, parcels.id))
    .where(eq(missionParcels.missionId, mission.id));

  const phytoRows = await db
    .select({
      product: phytosanitaryProducts,
      line: missionPhyto,
    })
    .from(missionPhyto)
    .leftJoin(
      phytosanitaryProducts,
      eq(missionPhyto.productId, phytosanitaryProducts.id),
    )
    .where(eq(missionPhyto.missionId, mission.id));

  return {
    albaran,
    mission,
    client,
    drone,
    pilot,
    parcels: parcelRows
      .filter(
        (r): r is { parcel: typeof parcels.$inferSelect; areaTreatedHa: string | null } =>
          r.parcel != null,
      )
      .map((r) => ({ parcel: r.parcel, areaTreatedHa: r.areaTreatedHa })),
    phyto: phytoRows.filter(
      (r): r is { product: typeof phytosanitaryProducts.$inferSelect; line: typeof missionPhyto.$inferSelect } =>
        r.product != null,
    ),
  };
}

/**
 * Genera el PDF del albarán con pdf-lib. v1 = layout funcional minimalista:
 * cabecera con código + AGM, datos cliente, datos misión, parcelas, productos,
 * firma, pie con hash.
 *
 * Identidad visual (logo, colores, tipografía AgroOps) se aplicará cuando
 * llegue el branding cerrado.
 */
export async function generateAlbaranPdf(
  albaranId: string,
): Promise<{ pdfPath: string; pdfHash: string }> {
  const ctx = await loadAlbaranContext(albaranId);
  if (!ctx) throw new Error("generateAlbaranPdf: contexto incompleto");

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]); // A4 portrait
  const { width, height } = page.getSize();

  let y = height - 50;
  const margin = 50;
  const lineH = 14;
  const text = (s: string, opts: { x?: number; y?: number; bold?: boolean; size?: number } = {}) => {
    page.drawText(s, {
      x: opts.x ?? margin,
      y: opts.y ?? y,
      size: opts.size ?? 10,
      font: opts.bold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
  };

  // ─── Cabecera ────────────────────────────────────────────────────
  text(`AgroOps · Albarán de aplicación fitosanitaria`, { bold: true, size: 13 });
  y -= 18;
  text(`Código: ${ctx.albaran.code}    Misión: ${ctx.mission.code}`, { bold: true });
  y -= lineH;
  text(`NPTA: ${ctx.mission.nptaReference}`);
  y -= lineH;
  text(
    `Generado: ${new Date().toLocaleString("es-ES")}    Firmado: ${
      ctx.albaran.signedAt ? ctx.albaran.signedAt.toLocaleString("es-ES") : "—"
    }`,
  );
  y -= lineH * 2;

  // ─── Cliente ─────────────────────────────────────────────────────
  text("Cliente", { bold: true, size: 11 });
  y -= lineH;
  text(`${ctx.client.name}    CIF/NIF: ${ctx.client.taxId}`);
  y -= lineH;
  if (ctx.client.billingAddress) {
    text(`${ctx.client.billingAddress}`);
    y -= lineH;
  }
  if (ctx.client.city || ctx.client.province) {
    text(
      `${[ctx.client.city, ctx.client.province, ctx.client.country]
        .filter(Boolean)
        .join(", ")}`,
    );
    y -= lineH;
  }
  y -= lineH;

  // ─── Operación ───────────────────────────────────────────────────
  text("Operación", { bold: true, size: 11 });
  y -= lineH;
  text(`Inicio vuelo: ${ctx.mission.startedAt?.toLocaleString("es-ES") ?? "—"}`);
  y -= lineH;
  text(`Fin vuelo:    ${ctx.mission.completedAt?.toLocaleString("es-ES") ?? "—"}`);
  y -= lineH;
  text(
    `Área tratada: ${
      ctx.mission.areaTreatedHa
        ? parseFloat(ctx.mission.areaTreatedHa).toFixed(2)
        : "—"
    } ha`,
  );
  y -= lineH;
  if (ctx.drone) {
    text(
      `Dron: ${ctx.drone.model} · serie ${ctx.drone.serialNumber} · EASA ${ctx.drone.easaClass}`,
    );
    y -= lineH;
  }
  if (ctx.pilot) {
    text(
      `Piloto: ${ctx.pilot.fullName} · NIF ${ctx.pilot.nif}${
        ctx.pilot.ropoQualified ? ` · ROPO ${ctx.pilot.ropoLevel ?? "+"}` : ""
      }`,
    );
    y -= lineH;
  }
  if (ctx.mission.weatherSnapshot) {
    const ws = ctx.mission.weatherSnapshot;
    text(
      `Meteo: viento ${ws.windSpeedMs?.toFixed(1) ?? "—"} m/s · lluvia ${
        ws.precipitationMm ?? "—"
      } mm · ${ws.temperatureC ?? "—"}°C · ${ws.humidityPct ?? "—"}% HR · apto=${
        ws.flightSuitable === true ? "sí" : ws.flightSuitable === false ? "no" : "—"
      }`,
    );
    y -= lineH;
  }
  y -= lineH;

  // ─── Parcelas ────────────────────────────────────────────────────
  text("Parcelas tratadas", { bold: true, size: 11 });
  y -= lineH;
  for (const p of ctx.parcels) {
    text(
      `· ${p.parcel.name} (SIGPAC ${p.parcel.sigpacReference}) · ${parseFloat(
        p.parcel.areaHectares,
      ).toFixed(2)} ha${p.parcel.crop ? ` · ${p.parcel.crop}` : ""}`,
    );
    y -= lineH;
  }
  y -= lineH;

  // ─── Productos ───────────────────────────────────────────────────
  text("Productos fitosanitarios aplicados", { bold: true, size: 11 });
  y -= lineH;
  if (ctx.phyto.length === 0) {
    text("· (sin productos registrados)");
    y -= lineH;
  } else {
    for (const ph of ctx.phyto) {
      text(
        `· ${ph.product.commercialName} (${ph.product.activeIngredient})`,
      );
      y -= lineH;
      text(
        `  Lote ${ph.line.lotUsed} · Dosis ${parseFloat(
          ph.line.appliedDoseValue,
        )} ${ph.line.appliedDoseUnit}${
          ph.line.totalAmountUsed
            ? ` · Total ${parseFloat(ph.line.totalAmountUsed)} ${ph.line.totalAmountUnit ?? ""}`
            : ""
        }${
          ph.line.areaCoveredHa
            ? ` · Área ${parseFloat(ph.line.areaCoveredHa).toFixed(2)} ha`
            : ""
        }`,
      );
      y -= lineH;
    }
  }
  y -= lineH;

  // ─── Firma ───────────────────────────────────────────────────────
  text("Firma del agricultor", { bold: true, size: 11 });
  y -= lineH;
  text(
    `${ctx.albaran.signerFullName ?? "—"}    NIF: ${
      ctx.albaran.signerNif ?? "—"
    }`,
  );
  y -= lineH;

  if (ctx.albaran.signatureImageBase64) {
    try {
      const base64 = ctx.albaran.signatureImageBase64.replace(
        /^data:image\/png;base64,/,
        "",
      );
      const pngBytes = Buffer.from(base64, "base64");
      const pngImage = await pdf.embedPng(pngBytes);
      const sigW = 200;
      const sigH = (pngImage.height * sigW) / pngImage.width;
      page.drawImage(pngImage, {
        x: margin,
        y: y - sigH,
        width: sigW,
        height: sigH,
      });
      y -= sigH + lineH;
    } catch (err) {
      console.warn("[albaran] embed firma falló:", err);
      text("(firma no embebida — error de imagen)");
      y -= lineH;
    }
  }

  // ─── Pie con hash ────────────────────────────────────────────────
  const tempBytes = await pdf.save();
  const hashHex = createHash("sha256").update(tempBytes).digest("hex");

  page.drawText(`SHA-256 (pre-hash): ${hashHex.substring(0, 32)}…`, {
    x: margin,
    y: 30,
    size: 7,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText(
    `AgroOps · NPTA Drovinci · ${ctx.albaran.code}`,
    {
      x: margin,
      y: 18,
      size: 7,
      font,
      color: rgb(0.4, 0.4, 0.4),
    },
  );

  const finalBytes = await pdf.save();
  const finalHash = createHash("sha256").update(finalBytes).digest("hex");

  // ─── Persistir en filesystem (HU-17) ─────────────────────────────
  const pdfPath = join(STORAGE_ROOT, `${ctx.albaran.code}.pdf`);
  await mkdir(dirname(pdfPath), { recursive: true });
  await writeFile(pdfPath, finalBytes);

  // Persistir path + hash en DB
  await db
    .update(albarans)
    .set({ pdfPath, pdfHash: finalHash })
    .where(eq(albarans.id, ctx.albaran.id));

  // suppress unused-import warning on `and` (re-export for future filters)
  void and;
  void width;

  return { pdfPath, pdfHash: finalHash };
}

/**
 * Lee el PDF persistido en filesystem. Devuelve null si el albarán no tiene
 * `pdfPath` o el archivo no existe.
 */
export async function readAlbaranPdf(code: string): Promise<Buffer | null> {
  const albaran = await getAlbaranByCode(code);
  if (!albaran?.pdfPath) return null;
  try {
    return await readFile(albaran.pdfPath);
  } catch (err) {
    console.warn(`[albaran] no se pudo leer ${albaran.pdfPath}:`, err);
    return null;
  }
}
