/**
 * AgroOps — integración Holded API (HU-18 / HU-19 / HU-20)
 *
 * Holded es la fuente de verdad fiscal (ADR-6). AgroOps:
 * - Sincroniza el contacto (cliente) en el directorio Holded — **HU-18**.
 * - Dispara la factura al cerrar el albarán — **HU-19**.
 * - Sincroniza el estado de la factura (paid / cancelled) — **HU-20**.
 *
 * NO almacena la factura: en `invoices_ref` guardamos sólo el ID, el número,
 * el importe denormalizado y el estado.
 *
 * Auth: header `key: <HOLDED_API_KEY>` (Holded usa header propio, no Bearer).
 * Docs: https://developers.holded.com/
 *
 * Reglas de robustez:
 * - Timeout 10s con AbortController.
 * - Errores 401 → reportar "API key inválida" (no silenciar).
 * - Errores 429 → reportar rate limit (Holded responde Retry-After).
 * - Errores 5xx → reportar para que el operador reintente; AgroOps no
 *   reintenta automáticamente en v1.0 (en HU-20 sí, para sync de estado).
 */
import { z } from "zod";

const HOLDED_API_KEY = process.env.HOLDED_API_KEY;
const HOLDED_BASE_URL =
  process.env.HOLDED_BASE_URL ?? "https://api.holded.com/api/invoicing/v1";
const HOLDED_TIMEOUT_MS = 10_000;

/**
 * Error tipado para problemas Holded. Permite distinguir en el caller entre
 * configuración faltante, autenticación, rate limit y errores de servidor.
 */
export class HoldedError extends Error {
  constructor(
    public readonly kind:
      | "not-configured"
      | "unauthorized"
      | "rate-limited"
      | "server-error"
      | "network"
      | "bad-response",
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "HoldedError";
  }
}

export function isHoldedConfigured(): boolean {
  return Boolean(HOLDED_API_KEY);
}

/**
 * Helper genérico HTTP con auth Holded + timeout. Maneja los errores HTTP
 * más relevantes y normaliza el cuerpo a JSON (`unknown` — el caller hace
 * narrow con su schema Zod).
 */
export async function holdedFetch(
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  if (!HOLDED_API_KEY) {
    throw new HoldedError(
      "not-configured",
      "HOLDED_API_KEY no definida. Configura en .env.local antes de operar Holded.",
    );
  }

  const url = path.startsWith("http") ? path : `${HOLDED_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HOLDED_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        key: HOLDED_API_KEY,
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      throw new HoldedError(
        "unauthorized",
        `Holded rechazó la API key (HTTP ${res.status}).`,
        res.status,
      );
    }
    if (res.status === 429) {
      throw new HoldedError(
        "rate-limited",
        `Holded rate limit alcanzado (HTTP 429). Retry-After: ${res.headers.get("retry-after") ?? "?"}.`,
        429,
      );
    }
    if (res.status >= 500) {
      throw new HoldedError(
        "server-error",
        `Holded server error (HTTP ${res.status}).`,
        res.status,
      );
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "<sin cuerpo>");
      throw new HoldedError(
        "bad-response",
        `Holded HTTP ${res.status}: ${body.slice(0, 200)}`,
        res.status,
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      // Algunos endpoints de Holded devuelven texto plano en errores. Si llegamos
      // aquí con res.ok pero sin JSON, ya es un caso raro — lo normalizamos.
      throw new HoldedError(
        "bad-response",
        `Holded respondió ${res.status} sin JSON (content-type: ${contentType}).`,
        res.status,
      );
    }

    return (await res.json()) as unknown;
  } catch (err) {
    if (err instanceof HoldedError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new HoldedError(
        "network",
        `Holded timeout (${HOLDED_TIMEOUT_MS} ms) en ${path}.`,
      );
    }
    throw new HoldedError(
      "network",
      `Holded fetch falló: ${err instanceof Error ? err.message : "desconocido"}.`,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// HU-18 — Ping + sincronización de contactos
// ============================================================================

/**
 * Subset del contacto Holded que nos interesa para AgroOps. Holded devuelve
 * más campos; nos quedamos con los identificativos.
 */
export const holdedContactSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  code: z.string().optional(), // CIF/NIF en Holded
  email: z.string().optional(),
  phone: z.string().optional(),
});
export type HoldedContact = z.infer<typeof holdedContactSchema>;

const holdedContactListSchema = z.array(holdedContactSchema);

/**
 * Ping a Holded. Devuelve `true` si la API key responde 200 en un endpoint
 * barato (GET /contacts con limit=1). No lanza en caso de "not-configured"
 * o "unauthorized" — el caller decide cómo mostrarlo (banner en UI).
 *
 * Distinguimos:
 * - `{ ok: true }`                                    → conexión correcta.
 * - `{ ok: false, reason: "not-configured" }`         → falta env var.
 * - `{ ok: false, reason: "unauthorized", ... }`      → API key inválida.
 * - `{ ok: false, reason: "network" | "server", ... }`→ Holded caído.
 */
export type HoldedPingResult =
  | { ok: true }
  | {
      ok: false;
      reason: HoldedError["kind"];
      message: string;
    };

export async function pingHolded(): Promise<HoldedPingResult> {
  try {
    await holdedFetch("/contacts?limit=1", { method: "GET" });
    return { ok: true };
  } catch (err) {
    if (err instanceof HoldedError) {
      return { ok: false, reason: err.kind, message: err.message };
    }
    return {
      ok: false,
      reason: "network",
      message: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

/**
 * Busca un contacto Holded por CIF/NIF (Holded lo expone como `code`).
 * Devuelve `null` si no existe.
 *
 * Holded paginación: `?page=1` (1-indexed). Para el matching usamos query
 * libre `?q=<taxId>` y filtramos en cliente — Holded no garantiza un
 * filtro server-side por `code` consistente.
 */
export async function findHoldedContactByTaxId(
  taxId: string,
): Promise<HoldedContact | null> {
  const raw = await holdedFetch(`/contacts?q=${encodeURIComponent(taxId)}`);
  const parsed = holdedContactListSchema.safeParse(raw);
  if (!parsed.success) return null;
  return (
    parsed.data.find((c) => c.code?.toLowerCase() === taxId.toLowerCase()) ??
    null
  );
}

/**
 * Búsqueda por email exacto. Útil cuando taxId aún no está en Holded pero
 * el contacto sí (creado por el equipo administrativo).
 */
export async function findHoldedContactByEmail(
  email: string,
): Promise<HoldedContact | null> {
  const raw = await holdedFetch(`/contacts?q=${encodeURIComponent(email)}`);
  const parsed = holdedContactListSchema.safeParse(raw);
  if (!parsed.success) return null;
  return (
    parsed.data.find(
      (c) => c.email?.toLowerCase() === email.toLowerCase(),
    ) ?? null
  );
}

/**
 * Input para crear contacto en Holded. Holded acepta más campos (dirección,
 * tipo, cuentas bancarias, ...); aquí sólo los obligatorios para que la
 * factura HU-19 funcione. Si el operador quiere completar el contacto en
 * Holded directamente, basta con el ID sincronizado.
 */
export const createHoldedContactInputSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).optional(), // CIF/NIF
  email: z.string().email().optional(),
  phone: z.string().optional(),
  type: z.enum(["client", "supplier"]).default("client"),
});
/**
 * Tipo **input** del schema (no output). `type` es opcional aquí porque
 * Zod aplica el default; usar `z.infer` daría `type: required`. Para
 * que el caller pueda omitirlo cómodamente usamos `z.input`.
 */
export type CreateHoldedContactInput = z.input<
  typeof createHoldedContactInputSchema
>;

/**
 * Schema de la respuesta de POST /contacts. Holded devuelve algo como
 * `{ status: 1, info: "...", id: "abc123" }`. Lo normalizamos a HoldedContact.
 */
const createContactResponseSchema = z.object({
  status: z.number().optional(),
  id: z.string(),
  info: z.string().optional(),
});

export async function createHoldedContact(
  input: CreateHoldedContactInput,
): Promise<HoldedContact> {
  const parsed = createHoldedContactInputSchema.parse(input);
  const raw = await holdedFetch("/contacts", {
    method: "POST",
    body: JSON.stringify(parsed),
  });
  const resp = createContactResponseSchema.parse(raw);
  return {
    id: resp.id,
    name: parsed.name,
    code: parsed.code,
    email: parsed.email,
    phone: parsed.phone,
  };
}

/**
 * Estrategia idempotente para vincular un cliente AgroOps con Holded:
 *
 * 1. Si tiene `holdedContactId` en DB → verificar que sigue existiendo y devolverlo.
 *    (En v1.0 nos fiamos del cache; v1.1 podría re-ping.)
 * 2. Si no, buscar por taxId.
 * 3. Si no, buscar por email (si lo tiene).
 * 4. Si no, crear nuevo.
 *
 * Devuelve `{ contact, created }` para que el caller decida si auditar como
 * "client.holded_linked" (found) vs "client.holded_created" (created).
 */
export interface ClientForHoldedSync {
  name: string;
  taxId: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  holdedContactId?: string | null;
}

export async function findOrCreateHoldedContact(
  client: ClientForHoldedSync,
): Promise<{ contact: HoldedContact; created: boolean }> {
  // Paso 1: si ya tenemos id cacheado, asumir válido en v1
  if (client.holdedContactId) {
    return {
      contact: {
        id: client.holdedContactId,
        name: client.name,
        code: client.taxId,
        email: client.contactEmail ?? undefined,
        phone: client.contactPhone ?? undefined,
      },
      created: false,
    };
  }

  // Paso 2: buscar por taxId
  const byTaxId = await findHoldedContactByTaxId(client.taxId);
  if (byTaxId) return { contact: byTaxId, created: false };

  // Paso 3: buscar por email (si lo hay)
  if (client.contactEmail) {
    const byEmail = await findHoldedContactByEmail(client.contactEmail);
    if (byEmail) return { contact: byEmail, created: false };
  }

  // Paso 4: crear
  const created = await createHoldedContact({
    name: client.name,
    code: client.taxId,
    email: client.contactEmail ?? undefined,
    phone: client.contactPhone ?? undefined,
    type: "client",
  });
  return { contact: created, created: true };
}

// ============================================================================
// HU-19 — Disparo de factura
// ============================================================================

export const holdedInvoicePayloadSchema = z.object({
  contactId: z.string().min(1),
  contactName: z.string().optional(),
  desc: z.string().min(1), // descripción de la factura (concepto general)
  date: z.number().int().positive(), // unix timestamp en segundos
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        units: z.number().positive(),
        subtotal: z.number().min(0), // precio unitario sin IVA
        tax: z.number().min(0).max(100).optional(), // IVA en %
      }),
    )
    .min(1),
  notes: z.string().optional(),
});
export type HoldedInvoicePayload = z.infer<typeof holdedInvoicePayloadSchema>;

export type HoldedInvoiceResult = {
  invoiceId: string;
  invoiceNumber?: string;
  url?: string;
  amount?: number;
  currency?: string;
};

/**
 * Schema de la respuesta de POST /documents/invoice de Holded. Holded suele
 * devolver `{ status: 1, info: "OK", id: "..." }`. Algunos endpoints
 * extendidos devuelven `invoiceNum` y `total`. Lo parseamos permisivamente.
 */
const createInvoiceResponseSchema = z.object({
  status: z.number().optional(),
  id: z.string(),
  info: z.string().optional(),
  invoiceNum: z.union([z.string(), z.number()]).optional(),
  total: z.number().optional(),
  currency: z.string().optional(),
});

/**
 * HU-19 — Dispara una factura en Holded.
 *
 * Tipo de documento: `invoice` (facturas emitidas). En Holded, el endpoint
 * canónico es `POST /documents/invoice`. La respuesta confirma con el `id`
 * de la factura creada; lo persistimos en `invoices_ref` para reconciliar
 * en HU-20.
 */
export async function createHoldedInvoice(
  payload: HoldedInvoicePayload,
): Promise<HoldedInvoiceResult> {
  const parsed = holdedInvoicePayloadSchema.parse(payload);
  const raw = await holdedFetch("/documents/invoice", {
    method: "POST",
    body: JSON.stringify(parsed),
  });
  const resp = createInvoiceResponseSchema.parse(raw);

  // Holded a veces devuelve `status: 0` con `info: "ya existe..."` en 200 OK.
  // Eso indica error de negocio aunque HTTP sea 200.
  if (resp.status !== undefined && resp.status !== 1) {
    throw new HoldedError(
      "bad-response",
      `Holded rechazó la factura: ${resp.info ?? "sin detalle"}`,
    );
  }

  return {
    invoiceId: resp.id,
    invoiceNumber:
      typeof resp.invoiceNum === "number"
        ? String(resp.invoiceNum)
        : resp.invoiceNum,
    amount: resp.total,
    currency: resp.currency ?? "EUR",
  };
}

// ============================================================================
// HU-20 — Sincronización de estado de factura
// ============================================================================

/**
 * Subset de la respuesta de GET /documents/invoice/{id}. Holded devuelve
 * muchos campos (líneas, contacto, banco, ...); aquí sólo los que afectan
 * a `invoices_ref` de AgroOps: estado de pago + número + URL + importe.
 *
 * Holded usa varios shapes según versión del API. Lo más fiable:
 * - `status` ∈ {0=draft, 1=issued/pendiente, 2=accepted, 3=paid, 4=cancelled, 5=overdue}
 *   (mapping aproximado — verificar en docs Holded antes de v1.1).
 * - `paid` boolean en algunas variantes.
 * - `paymentsTotal` o `paid` para detectar pago.
 *
 * En v1 mapeamos defensivamente: si `paid:true` o `status===3` → pagada.
 * Si `status===4` → cancelada. Resto → issued (ya emitida, esperando pago).
 */
const holdedInvoiceStatusResponseSchema = z.object({
  id: z.string().optional(),
  invoiceNum: z.union([z.string(), z.number()]).optional(),
  status: z.union([z.string(), z.number()]).optional(),
  paid: z.union([z.boolean(), z.number()]).optional(),
  paymentsTotal: z.number().optional(),
  total: z.number().optional(),
  currency: z.string().optional(),
  paidAt: z.number().optional(), // unix ts si Holded lo devuelve
});

export interface HoldedInvoiceSnapshot {
  /** Estado normalizado AgroOps. Mapea el campo `invoice_status` enum de DB. */
  status: "issued" | "paid" | "cancelled";
  /** Si está pagada, instante de pago (best-effort: paidAt → updated_at). */
  paidAt: Date | null;
  /** Importe total (con IVA) según Holded. */
  amount: number | null;
  /** Número factura (puede haber cambiado si el operador la editó en Holded). */
  invoiceNumber: string | null;
  currency: string;
  /** Indica si el snapshot detectó pago (paid=true o status=3). */
  isPaid: boolean;
  /** Indica si la factura está cancelada en Holded. */
  isCancelled: boolean;
}

/**
 * HU-20 — Lee el estado actual de una factura en Holded y lo normaliza.
 * No persiste — eso lo hace el service `syncInvoiceStatusForMission`.
 */
export async function syncHoldedInvoiceStatus(
  invoiceId: string,
): Promise<HoldedInvoiceSnapshot> {
  if (!invoiceId) {
    throw new HoldedError(
      "bad-response",
      "syncHoldedInvoiceStatus: invoiceId requerido",
    );
  }
  const raw = await holdedFetch(
    `/documents/invoice/${encodeURIComponent(invoiceId)}`,
    { method: "GET" },
  );
  const parsed = holdedInvoiceStatusResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new HoldedError(
      "bad-response",
      `Holded GET invoice respondió con shape inesperado: ${parsed.error.issues[0]?.message ?? ""}`,
    );
  }
  const data = parsed.data;

  // Detección de pago: aceptamos `paid:true`, `paid:1`, o `status===3`.
  const isPaid =
    data.paid === true ||
    data.paid === 1 ||
    data.status === 3 ||
    data.status === "3";

  // Cancelación: `status===4` (o 'cancelled' si Holded devuelve string).
  const isCancelled =
    data.status === 4 ||
    data.status === "4" ||
    String(data.status ?? "").toLowerCase() === "cancelled";

  const status: HoldedInvoiceSnapshot["status"] = isCancelled
    ? "cancelled"
    : isPaid
      ? "paid"
      : "issued";

  return {
    status,
    paidAt: data.paidAt ? new Date(data.paidAt * 1000) : null,
    amount: data.total ?? null,
    invoiceNumber:
      typeof data.invoiceNum === "number"
        ? String(data.invoiceNum)
        : (data.invoiceNum ?? null),
    currency: data.currency ?? "EUR",
    isPaid,
    isCancelled,
  };
}
