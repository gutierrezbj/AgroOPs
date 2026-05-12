/**
 * AgroOps — invoicing services (HU-19)
 *
 * Lógica de facturación: construye payloads Holded a partir de una misión
 * completada + albarán firmado y dispara `createHoldedInvoice`. Persiste el
 * resultado en `invoices_ref` (con status `issued` o `error`).
 *
 * El audit log se hace en la Server Action que llama, no aquí.
 *
 * Reglas v1:
 * - 1 factura por misión (relación 1:1 vía invoices_ref.missionId UNIQUE).
 * - 1 línea por defecto: "Aplicación fitosanitaria aérea — N ha · €/ha".
 *   En v1.1 evaluaremos 1 línea por parcela si el cliente lo requiere.
 * - Precio = `getPricePerHaEur()` × `mission.areaTreatedHa`. Si el precio
 *   no está configurado, abortar antes de tocar Holded.
 * - IVA = `getInvoiceVatPct()` (default 21%).
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, type Client } from "@/db/schema/clients";
import { missions, type Mission } from "@/db/schema/missions";
import {
  invoicesRef,
  type InvoiceRef,
  type InvoiceStatus,
} from "@/db/schema/invoices-ref";
import { albarans, type Albaran } from "@/db/schema/albarans";
import {
  createHoldedInvoice,
  HoldedError,
  syncHoldedInvoiceStatus,
  type HoldedInvoiceResult,
  type HoldedInvoiceSnapshot,
} from "@/server/integrations/holded";
import { getInvoiceVatPct, getPricePerHaEur } from "@/lib/constants";

/**
 * Error tipado para problemas de facturación detectables ANTES de tocar
 * Holded. Permite al caller distinguir entre "imposible facturar"
 * (cliente sin sync, sin precio, etc.) y "Holded falló".
 */
export class InvoicingError extends Error {
  constructor(
    public readonly kind:
      | "mission-not-found"
      | "mission-not-completed"
      | "albaran-missing"
      | "albaran-not-signed"
      | "client-not-synced"
      | "price-not-configured"
      | "area-missing"
      | "already-invoiced",
    message: string,
  ) {
    super(message);
    this.name = "InvoicingError";
  }
}

export interface CreateInvoiceResult {
  invoiceRef: InvoiceRef;
  holded: HoldedInvoiceResult;
  /** € sin IVA (subtotal). */
  subtotalEur: number;
  /** € de IVA. */
  vatEur: number;
  /** € totales (subtotal + IVA). */
  totalEur: number;
  vatPct: number;
  pricePerHaEur: number;
  areaHa: number;
}

/**
 * Devuelve la `invoice_ref` asociada a una misión, o null si no existe.
 * Útil para mostrar el panel de factura en `/dashboard/missions/[id]` y
 * para el side-effect del state machine (no duplicar disparos).
 */
export async function getInvoiceForMission(
  missionId: string,
): Promise<InvoiceRef | null> {
  const row = await db.query.invoicesRef.findFirst({
    where: eq(invoicesRef.missionId, missionId),
  });
  return row ?? null;
}

interface InvoiceContext {
  mission: Mission;
  client: Client;
  albaran: Albaran;
  existing: InvoiceRef | null;
  pricePerHa: number;
  vatPct: number;
  areaHa: number;
}

/**
 * Carga y valida los datos necesarios para emitir la factura. Lanza
 * `InvoicingError` con `kind` específico si algo falla, para que el caller
 * mapee a UI hint o gate result.
 */
export async function loadInvoiceContext(
  missionId: string,
): Promise<InvoiceContext> {
  const mission = await db.query.missions.findFirst({
    where: eq(missions.id, missionId),
  });
  if (!mission) {
    throw new InvoicingError(
      "mission-not-found",
      `Misión ${missionId} no existe.`,
    );
  }
  if (mission.status !== "completed" && mission.status !== "invoiced") {
    throw new InvoicingError(
      "mission-not-completed",
      `La misión está en estado "${mission.status}". Sólo se factura desde "completed".`,
    );
  }
  if (!mission.areaTreatedHa) {
    throw new InvoicingError(
      "area-missing",
      "La misión no tiene area_treated_ha registrada.",
    );
  }
  const areaHa = parseFloat(mission.areaTreatedHa);
  if (!Number.isFinite(areaHa) || areaHa <= 0) {
    throw new InvoicingError(
      "area-missing",
      `area_treated_ha inválida (${mission.areaTreatedHa}).`,
    );
  }

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, mission.clientId),
  });
  if (!client) {
    throw new InvoicingError(
      "mission-not-found",
      `Cliente ${mission.clientId} no existe.`,
    );
  }
  if (!client.holdedContactId) {
    throw new InvoicingError(
      "client-not-synced",
      `El cliente "${client.name}" no está vinculado con Holded. Sincronízalo desde /dashboard/clients/${client.id} antes de facturar.`,
    );
  }

  const albaran = await db.query.albarans.findFirst({
    where: eq(albarans.missionId, missionId),
  });
  if (!albaran) {
    throw new InvoicingError(
      "albaran-missing",
      "No se ha emitido albarán para esta misión. Firma el albarán antes de facturar.",
    );
  }
  if (!albaran.signedAt) {
    throw new InvoicingError(
      "albaran-not-signed",
      "El albarán existe pero no está firmado por el agricultor.",
    );
  }

  const pricePerHa = getPricePerHaEur();
  if (pricePerHa <= 0) {
    throw new InvoicingError(
      "price-not-configured",
      "AGROOPS_PRICE_PER_HA_EUR no configurado o ≤ 0. Define la tarifa en .env.local antes de facturar.",
    );
  }
  const vatPct = getInvoiceVatPct();

  const existing = await getInvoiceForMission(missionId);

  return {
    mission,
    client,
    albaran,
    existing,
    pricePerHa,
    vatPct,
    areaHa,
  };
}

/**
 * HU-19 — Dispara la factura en Holded para una misión completada.
 *
 * Estrategia:
 * 1. Cargar contexto y validar prerequisitos (sin tocar Holded).
 * 2. Si ya hay invoice_ref con estado `issued` → throw "already-invoiced"
 *    (caller decide si es OK — el state machine NO debe duplicar).
 * 3. Si hay invoice_ref con estado `error` → reintentar (mantiene el row,
 *    actualiza con el nuevo resultado).
 * 4. Construir payload Holded con item agregado.
 * 5. POST a Holded. Si falla → persiste `error` + re-throw.
 * 6. Si OK → persiste `issued` con holdedInvoiceId/Number/Url/Amount.
 *
 * **NO** transita la misión a `invoiced` — eso lo hace el state machine
 * después de validar el resultado.
 */
export async function createInvoiceForMission(
  missionId: string,
): Promise<CreateInvoiceResult> {
  const ctx = await loadInvoiceContext(missionId);

  if (ctx.existing && ctx.existing.status === "issued") {
    throw new InvoicingError(
      "already-invoiced",
      `La misión ya tiene factura emitida (${ctx.existing.holdedInvoiceNumber ?? ctx.existing.holdedInvoiceId}).`,
    );
  }

  const subtotalEur = round2(ctx.pricePerHa * ctx.areaHa);
  const vatEur = round2((subtotalEur * ctx.vatPct) / 100);
  const totalEur = round2(subtotalEur + vatEur);

  const desc = `Aplicación fitosanitaria aérea — ${ctx.mission.code}${
    ctx.albaran.code ? ` · Albarán ${ctx.albaran.code}` : ""
  }`;

  const itemName = `Aplicación fitosanitaria aérea (${ctx.areaHa.toFixed(2)} ha × ${ctx.pricePerHa.toFixed(2)} €/ha)`;

  let holdedResult: HoldedInvoiceResult;
  try {
    holdedResult = await createHoldedInvoice({
      contactId: ctx.client.holdedContactId!,
      contactName: ctx.client.name,
      desc,
      date: Math.floor(Date.now() / 1000),
      items: [
        {
          name: itemName,
          units: ctx.areaHa,
          subtotal: ctx.pricePerHa,
          tax: ctx.vatPct,
        },
      ],
      notes: ctx.mission.notes ?? undefined,
    });
  } catch (err) {
    // Persistir el fallo para que la UI lo muestre y permita retry
    await upsertInvoiceRef({
      missionId,
      status: "error",
      errorMessage:
        err instanceof Error ? err.message.slice(0, 500) : "Error desconocido",
      amount: null,
      holdedInvoiceId: null,
      holdedInvoiceNumber: null,
      holdedInvoiceUrl: null,
      existingId: ctx.existing?.id,
    });
    throw err; // re-throw para que caller (state machine action) lo capture
  }

  const invoiceRef = await upsertInvoiceRef({
    missionId,
    status: "issued",
    holdedInvoiceId: holdedResult.invoiceId,
    holdedInvoiceNumber: holdedResult.invoiceNumber ?? null,
    holdedInvoiceUrl: holdedResult.invoiceId
      ? `https://app.holded.com/invoices/${holdedResult.invoiceId}`
      : null,
    amount: totalEur,
    errorMessage: null,
    issuedAt: new Date(),
    existingId: ctx.existing?.id,
  });

  return {
    invoiceRef,
    holded: holdedResult,
    subtotalEur,
    vatEur,
    totalEur,
    vatPct: ctx.vatPct,
    pricePerHaEur: ctx.pricePerHa,
    areaHa: ctx.areaHa,
  };
}

interface UpsertInvoiceRefInput {
  missionId: string;
  status: InvoiceStatus;
  holdedInvoiceId?: string | null;
  holdedInvoiceNumber?: string | null;
  holdedInvoiceUrl?: string | null;
  amount?: number | null;
  errorMessage?: string | null;
  issuedAt?: Date | null;
  /** Si existe un row previo, lo actualizamos en lugar de insertar. */
  existingId?: string;
}

async function upsertInvoiceRef(
  input: UpsertInvoiceRefInput,
): Promise<InvoiceRef> {
  const values = {
    missionId: input.missionId,
    status: input.status,
    holdedInvoiceId: input.holdedInvoiceId ?? null,
    holdedInvoiceNumber: input.holdedInvoiceNumber ?? null,
    holdedInvoiceUrl: input.holdedInvoiceUrl ?? null,
    amount: input.amount != null ? input.amount.toFixed(2) : null,
    errorMessage: input.errorMessage ?? null,
    issuedAt: input.issuedAt ?? null,
  };

  if (input.existingId) {
    const [updated] = await db
      .update(invoicesRef)
      .set(values)
      .where(eq(invoicesRef.id, input.existingId))
      .returning();
    if (!updated) throw new Error("upsertInvoiceRef: update no devolvió fila");
    return updated;
  }

  const [inserted] = await db.insert(invoicesRef).values(values).returning();
  if (!inserted) throw new Error("upsertInvoiceRef: insert no devolvió fila");
  return inserted;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================================
// HU-20 — Sincronización estado factura → AgroOps
// ============================================================================

export interface SyncInvoiceStatusResult {
  invoiceRef: InvoiceRef;
  snapshot: HoldedInvoiceSnapshot;
  /** True si el sync cambió el status en `invoices_ref` (paid/cancelled). */
  changed: boolean;
}

/**
 * HU-20 — Pregunta a Holded el estado actual de la factura de una misión y
 * actualiza `invoices_ref` si cambió (issued → paid o issued → cancelled).
 *
 * Útil para:
 * - Botón "Sincronizar estado" en `/dashboard/missions/[id]` (manual).
 * - Job batch que recorre invoices con status='issued' antiguas y refresca
 *   (HU-25 observabilidad lo puede planificar como tarea diaria).
 *
 * Casos:
 * - Si no existe `invoices_ref` o no tiene `holdedInvoiceId` → lanza
 *   `InvoicingError("mission-not-found", ...)` (no hay nada que sincronizar).
 * - Si Holded falla → re-throw `HoldedError` (caller decide).
 * - Si el snapshot coincide con el status persistido → `changed: false`.
 * - Si el snapshot indica `paid` o `cancelled` → actualiza row y `changed: true`.
 *
 * No transita la misión a otros estados (`paid` no cambia mission.status,
 * que ya quedó `invoiced`; cancelled tampoco propaga a mission.cancelled —
 * eso requiere decisión del operador).
 */
export async function syncInvoiceStatusForMission(
  missionId: string,
): Promise<SyncInvoiceStatusResult> {
  const existing = await getInvoiceForMission(missionId);
  if (!existing) {
    throw new InvoicingError(
      "mission-not-found",
      `La misión ${missionId} no tiene factura registrada todavía.`,
    );
  }
  if (!existing.holdedInvoiceId) {
    throw new InvoicingError(
      "mission-not-found",
      `La factura local (invoices_ref ${existing.id}) no tiene holdedInvoiceId — ¿se quedó en status=error?`,
    );
  }

  const snapshot = await syncHoldedInvoiceStatus(existing.holdedInvoiceId);

  // Detectar si el status cambió
  const changed = existing.status !== snapshot.status;
  if (!changed && existing.holdedInvoiceNumber === snapshot.invoiceNumber) {
    return { invoiceRef: existing, snapshot, changed: false };
  }

  // Persistir el cambio
  const updates: Partial<typeof invoicesRef.$inferInsert> = {
    status: snapshot.status,
  };
  if (snapshot.invoiceNumber && snapshot.invoiceNumber !== existing.holdedInvoiceNumber) {
    updates.holdedInvoiceNumber = snapshot.invoiceNumber;
  }
  if (snapshot.amount != null) {
    updates.amount = snapshot.amount.toFixed(2);
  }
  if (snapshot.isPaid && !existing.paidAt) {
    updates.paidAt = snapshot.paidAt ?? new Date();
  }

  const [updated] = await db
    .update(invoicesRef)
    .set(updates)
    .where(eq(invoicesRef.id, existing.id))
    .returning();

  if (!updated) {
    throw new Error("syncInvoiceStatusForMission: update no devolvió fila");
  }

  return { invoiceRef: updated, snapshot, changed };
}

// Re-export para que las actions puedan distinguir
export { HoldedError };
