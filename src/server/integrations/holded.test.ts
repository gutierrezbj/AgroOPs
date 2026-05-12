/**
 * AgroOps — Holded integration tests (HU-18)
 *
 * Mock de `global.fetch` con `vi.spyOn`. No tocamos Holded real. Probamos:
 * - holdedFetch: not-configured / 401 / 429 / 500 / timeout / bad content-type / ok
 * - pingHolded: ok + reason="unauthorized" cuando 401
 * - findHoldedContactByTaxId / Email: matching server + filter cliente
 * - createHoldedContact: parsea respuesta y normaliza a HoldedContact
 * - findOrCreateHoldedContact: 4 ramas (cache → taxId → email → create)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_KEY = process.env.HOLDED_API_KEY;

/**
 * Importamos el módulo dinámicamente en cada test para que las env vars
 * (HOLDED_API_KEY) leídas en módulo-init se actualicen. Holded.ts captura
 * el valor en top-level una sola vez por proceso si lo importamos estático.
 */
async function loadHolded() {
  // Reset módulo para releer env
  vi.resetModules();
  return import("./holded");
}

function mockFetch(response: {
  status?: number;
  json?: unknown;
  text?: string;
  contentType?: string;
  headers?: Record<string, string>;
  throws?: Error;
}) {
  return vi.fn(async () => {
    if (response.throws) throw response.throws;
    const status = response.status ?? 200;
    const headersMap = new Map<string, string>(
      Object.entries({
        "content-type": response.contentType ?? "application/json",
        ...(response.headers ?? {}),
      }),
    );
    const headersObj = {
      get: (k: string) => headersMap.get(k.toLowerCase()) ?? null,
    };
    return {
      status,
      ok: status >= 200 && status < 300,
      headers: headersObj,
      json: async () => response.json ?? null,
      text: async () => response.text ?? "",
    } as unknown as Response;
  });
}

beforeEach(() => {
  process.env.HOLDED_API_KEY = "test-key-XXX";
});
afterEach(() => {
  process.env.HOLDED_API_KEY = ORIGINAL_KEY;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// holdedFetch
// ---------------------------------------------------------------------------
describe("holdedFetch", () => {
  it("lanza HoldedError 'not-configured' si falta HOLDED_API_KEY", async () => {
    delete process.env.HOLDED_API_KEY;
    const { holdedFetch, HoldedError } = await loadHolded();
    await expect(holdedFetch("/contacts")).rejects.toBeInstanceOf(HoldedError);
    try {
      await holdedFetch("/contacts");
    } catch (err) {
      expect((err as InstanceType<typeof HoldedError>).kind).toBe(
        "not-configured",
      );
    }
  });

  it("manda header `key` y devuelve JSON parseado en 200", async () => {
    const { holdedFetch } = await loadHolded();
    const spy = mockFetch({ status: 200, json: { hello: "world" } });
    vi.stubGlobal("fetch", spy);

    const result = await holdedFetch("/contacts");

    expect(result).toEqual({ hello: "world" });
    expect(spy).toHaveBeenCalledOnce();
    const call = spy.mock.calls[0] as unknown as [string, RequestInit];
    const [url, init] = call;
    expect(url).toMatch(/\/contacts$/);
    const headers = init.headers as Record<string, string>;
    expect(headers.key).toBe("test-key-XXX");
    expect(headers.accept).toBe("application/json");
  });

  it("lanza 'unauthorized' en 401", async () => {
    const { holdedFetch, HoldedError } = await loadHolded();
    vi.stubGlobal("fetch", mockFetch({ status: 401 }));
    try {
      await holdedFetch("/contacts");
      expect.fail("debió lanzar");
    } catch (err) {
      const e = err as InstanceType<typeof HoldedError>;
      expect(e).toBeInstanceOf(HoldedError);
      expect(e.kind).toBe("unauthorized");
      expect(e.status).toBe(401);
    }
  });

  it("lanza 'rate-limited' en 429", async () => {
    const { holdedFetch, HoldedError } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        status: 429,
        headers: { "retry-after": "60" },
      }),
    );
    try {
      await holdedFetch("/contacts");
      expect.fail("debió lanzar");
    } catch (err) {
      const e = err as InstanceType<typeof HoldedError>;
      expect(e.kind).toBe("rate-limited");
      expect(e.message).toContain("Retry-After: 60");
    }
  });

  it("lanza 'server-error' en 500", async () => {
    const { holdedFetch, HoldedError } = await loadHolded();
    vi.stubGlobal("fetch", mockFetch({ status: 503 }));
    try {
      await holdedFetch("/contacts");
      expect.fail("debió lanzar");
    } catch (err) {
      const e = err as InstanceType<typeof HoldedError>;
      expect(e.kind).toBe("server-error");
      expect(e.status).toBe(503);
    }
  });

  it("lanza 'bad-response' si 200 con content-type no JSON", async () => {
    const { holdedFetch, HoldedError } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        status: 200,
        contentType: "text/html",
      }),
    );
    try {
      await holdedFetch("/contacts");
      expect.fail("debió lanzar");
    } catch (err) {
      expect((err as InstanceType<typeof HoldedError>).kind).toBe(
        "bad-response",
      );
    }
  });

  it("lanza 'network' si fetch tira AbortError (timeout)", async () => {
    const { holdedFetch, HoldedError } = await loadHolded();
    const abortErr = new DOMException("aborted", "AbortError");
    vi.stubGlobal("fetch", mockFetch({ throws: abortErr }));
    try {
      await holdedFetch("/contacts");
      expect.fail("debió lanzar");
    } catch (err) {
      const e = err as InstanceType<typeof HoldedError>;
      expect(e.kind).toBe("network");
      expect(e.message).toMatch(/timeout/);
    }
  });
});

// ---------------------------------------------------------------------------
// pingHolded
// ---------------------------------------------------------------------------
describe("pingHolded", () => {
  it("devuelve { ok: true } si responde 200 con JSON array", async () => {
    const { pingHolded } = await loadHolded();
    vi.stubGlobal("fetch", mockFetch({ status: 200, json: [] }));
    const result = await pingHolded();
    expect(result.ok).toBe(true);
  });

  it("devuelve { ok: false, reason: 'not-configured' } sin env", async () => {
    delete process.env.HOLDED_API_KEY;
    const { pingHolded } = await loadHolded();
    const result = await pingHolded();
    expect(result).toEqual({
      ok: false,
      reason: "not-configured",
      message: expect.stringContaining("HOLDED_API_KEY"),
    });
  });

  it("devuelve { ok: false, reason: 'unauthorized' } en 401", async () => {
    const { pingHolded } = await loadHolded();
    vi.stubGlobal("fetch", mockFetch({ status: 401 }));
    const result = await pingHolded();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unauthorized");
    }
  });
});

// ---------------------------------------------------------------------------
// findHoldedContactByTaxId / Email
// ---------------------------------------------------------------------------
describe("findHoldedContactByTaxId", () => {
  it("devuelve el contacto cuyo `code` coincide case-insensitive", async () => {
    const { findHoldedContactByTaxId } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        status: 200,
        json: [
          { id: "ctc_1", name: "Otro", code: "A11111111" },
          { id: "ctc_2", name: "Cooperativa La Solana", code: "B22222222" },
        ],
      }),
    );
    const result = await findHoldedContactByTaxId("b22222222");
    expect(result?.id).toBe("ctc_2");
  });

  it("devuelve null si ningún contacto coincide", async () => {
    const { findHoldedContactByTaxId } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        status: 200,
        json: [{ id: "ctc_1", name: "Otro", code: "A11111111" }],
      }),
    );
    const result = await findHoldedContactByTaxId("B22222222");
    expect(result).toBeNull();
  });

  it("devuelve null si Holded responde forma rara", async () => {
    const { findHoldedContactByTaxId } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({ status: 200, json: { error: "weird" } }),
    );
    const result = await findHoldedContactByTaxId("B22222222");
    expect(result).toBeNull();
  });
});

describe("findHoldedContactByEmail", () => {
  it("matchea email case-insensitive", async () => {
    const { findHoldedContactByEmail } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        status: 200,
        json: [
          { id: "ctc_1", email: "admin@otra.es" },
          { id: "ctc_2", email: "Contacto@LaSolana.es" },
        ],
      }),
    );
    const result = await findHoldedContactByEmail("contacto@lasolana.es");
    expect(result?.id).toBe("ctc_2");
  });
});

// ---------------------------------------------------------------------------
// createHoldedContact
// ---------------------------------------------------------------------------
describe("createHoldedContact", () => {
  it("envía POST y normaliza respuesta a HoldedContact", async () => {
    const { createHoldedContact } = await loadHolded();
    const spy = mockFetch({
      status: 200,
      json: { status: 1, info: "OK", id: "ctc_new_42" },
    });
    vi.stubGlobal("fetch", spy);

    const result = await createHoldedContact({
      name: "Cooperativa La Solana",
      code: "B22222222",
      email: "contacto@lasolana.es",
      type: "client",
    });

    expect(result).toEqual({
      id: "ctc_new_42",
      name: "Cooperativa La Solana",
      code: "B22222222",
      email: "contacto@lasolana.es",
      phone: undefined,
    });
    const call = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[1].method).toBe("POST");
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.name).toBe("Cooperativa La Solana");
    expect(body.type).toBe("client");
  });

  it("aplica default `type=client` si no se pasa", async () => {
    const { createHoldedContact } = await loadHolded();
    const spy = mockFetch({
      status: 200,
      json: { id: "ctc_new", info: "OK" },
    });
    vi.stubGlobal("fetch", spy);

    await createHoldedContact({ name: "X", code: "A1" });

    const call = spy.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.type).toBe("client");
  });
});

// ---------------------------------------------------------------------------
// findOrCreateHoldedContact
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// createHoldedInvoice (HU-19)
// ---------------------------------------------------------------------------
describe("createHoldedInvoice (HU-19)", () => {
  const validPayload = {
    contactId: "ctc_42",
    contactName: "Cooperativa La Solana",
    desc: "Aplicación fitosanitaria aérea — AGM-2026-0001",
    date: Math.floor(Date.now() / 1000),
    items: [
      {
        name: "Aplicación fitosanitaria aérea (4.50 ha × 25.00 €/ha)",
        units: 4.5,
        subtotal: 25.0,
        tax: 21,
      },
    ],
  };

  it("envía POST /documents/invoice y normaliza la respuesta", async () => {
    const { createHoldedInvoice } = await loadHolded();
    const spy = mockFetch({
      status: 200,
      json: {
        status: 1,
        info: "OK",
        id: "inv_abc123",
        invoiceNum: "2026-1042",
        total: 136.13,
        currency: "EUR",
      },
    });
    vi.stubGlobal("fetch", spy);

    const result = await createHoldedInvoice(validPayload);

    expect(result).toEqual({
      invoiceId: "inv_abc123",
      invoiceNumber: "2026-1042",
      amount: 136.13,
      currency: "EUR",
    });
    const call = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toMatch(/\/documents\/invoice$/);
    expect(call[1].method).toBe("POST");
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.contactId).toBe("ctc_42");
    expect(body.items).toHaveLength(1);
  });

  it("normaliza invoiceNum numérico a string", async () => {
    const { createHoldedInvoice } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        status: 200,
        json: { status: 1, id: "inv_xyz", invoiceNum: 999 },
      }),
    );
    const result = await createHoldedInvoice(validPayload);
    expect(result.invoiceNumber).toBe("999");
    expect(typeof result.invoiceNumber).toBe("string");
  });

  it("default currency EUR si Holded no lo devuelve", async () => {
    const { createHoldedInvoice } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        status: 200,
        json: { status: 1, id: "inv_eur" },
      }),
    );
    const result = await createHoldedInvoice(validPayload);
    expect(result.currency).toBe("EUR");
  });

  it("lanza HoldedError bad-response si Holded devuelve status=0 con info", async () => {
    const { createHoldedInvoice, HoldedError } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        status: 200,
        json: {
          status: 0,
          id: "inv_dup",
          info: "Ya existe una factura con ese número",
        },
      }),
    );
    try {
      await createHoldedInvoice(validPayload);
      expect.fail("debió lanzar");
    } catch (err) {
      const e = err as InstanceType<typeof HoldedError>;
      expect(e).toBeInstanceOf(HoldedError);
      expect(e.kind).toBe("bad-response");
      expect(e.message).toContain("Ya existe");
    }
  });

  it("propaga errores HoldedError genéricos (401, 5xx, etc.)", async () => {
    const { createHoldedInvoice, HoldedError } = await loadHolded();
    vi.stubGlobal("fetch", mockFetch({ status: 401 }));
    try {
      await createHoldedInvoice(validPayload);
      expect.fail("debió lanzar");
    } catch (err) {
      expect((err as InstanceType<typeof HoldedError>).kind).toBe(
        "unauthorized",
      );
    }
  });

  it("valida payload con Zod antes de tocar fetch", async () => {
    const { createHoldedInvoice } = await loadHolded();
    const spy = mockFetch({ status: 200, json: { id: "inv_x" } });
    vi.stubGlobal("fetch", spy);
    await expect(
      createHoldedInvoice({
        ...validPayload,
        contactId: "", // inválido (min(1))
      }),
    ).rejects.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// syncHoldedInvoiceStatus (HU-20)
// ---------------------------------------------------------------------------
describe("syncHoldedInvoiceStatus (HU-20)", () => {
  it("normaliza paid:true → status='paid'", async () => {
    const { syncHoldedInvoiceStatus } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        status: 200,
        json: {
          id: "inv_abc",
          invoiceNum: "2026-1042",
          status: 3,
          paid: true,
          total: 136.13,
          currency: "EUR",
          paidAt: 1715520000,
        },
      }),
    );
    const result = await syncHoldedInvoiceStatus("inv_abc");
    expect(result.status).toBe("paid");
    expect(result.isPaid).toBe(true);
    expect(result.amount).toBe(136.13);
    expect(result.invoiceNumber).toBe("2026-1042");
    expect(result.paidAt).toBeInstanceOf(Date);
  });

  it("normaliza status=3 sin paid:true → status='paid'", async () => {
    const { syncHoldedInvoiceStatus } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({ status: 200, json: { status: 3, total: 100 } }),
    );
    const result = await syncHoldedInvoiceStatus("inv_x");
    expect(result.status).toBe("paid");
  });

  it("normaliza status=4 → status='cancelled'", async () => {
    const { syncHoldedInvoiceStatus } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({ status: 200, json: { status: 4 } }),
    );
    const result = await syncHoldedInvoiceStatus("inv_x");
    expect(result.status).toBe("cancelled");
    expect(result.isCancelled).toBe(true);
  });

  it("normaliza status='cancelled' string → cancelled", async () => {
    const { syncHoldedInvoiceStatus } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({ status: 200, json: { status: "cancelled" } }),
    );
    const result = await syncHoldedInvoiceStatus("inv_x");
    expect(result.status).toBe("cancelled");
  });

  it("default 'issued' si no hay paid ni cancelled", async () => {
    const { syncHoldedInvoiceStatus } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({ status: 200, json: { status: 1, total: 50 } }),
    );
    const result = await syncHoldedInvoiceStatus("inv_x");
    expect(result.status).toBe("issued");
    expect(result.isPaid).toBe(false);
  });

  it("paidAt es null si Holded no lo devuelve", async () => {
    const { syncHoldedInvoiceStatus } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({ status: 200, json: { status: 3, paid: true } }),
    );
    const result = await syncHoldedInvoiceStatus("inv_x");
    expect(result.paidAt).toBeNull();
  });

  it("EUR default si Holded no devuelve currency", async () => {
    const { syncHoldedInvoiceStatus } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({ status: 200, json: { status: 1 } }),
    );
    const result = await syncHoldedInvoiceStatus("inv_x");
    expect(result.currency).toBe("EUR");
  });

  it("invoiceNum numérico → string normalizado", async () => {
    const { syncHoldedInvoiceStatus } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({ status: 200, json: { status: 1, invoiceNum: 42 } }),
    );
    const result = await syncHoldedInvoiceStatus("inv_x");
    expect(result.invoiceNumber).toBe("42");
  });

  it("lanza HoldedError si invoiceId vacío", async () => {
    const { syncHoldedInvoiceStatus, HoldedError } = await loadHolded();
    await expect(syncHoldedInvoiceStatus("")).rejects.toBeInstanceOf(
      HoldedError,
    );
  });

  it("lanza HoldedError bad-response si shape inesperado", async () => {
    const { syncHoldedInvoiceStatus, HoldedError } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        status: 200,
        // status como objeto no es válido por el schema → bad-response
        json: { status: { weird: true } },
      }),
    );
    try {
      await syncHoldedInvoiceStatus("inv_x");
      expect.fail("debió lanzar");
    } catch (err) {
      expect((err as InstanceType<typeof HoldedError>).kind).toBe(
        "bad-response",
      );
    }
  });

  it("URL del GET incluye el invoiceId encodeado", async () => {
    const { syncHoldedInvoiceStatus } = await loadHolded();
    const spy = mockFetch({ status: 200, json: { status: 1 } });
    vi.stubGlobal("fetch", spy);
    await syncHoldedInvoiceStatus("inv with spaces");
    const call = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toMatch(/inv%20with%20spaces$/);
    expect(call[1].method).toBe("GET");
  });
});

describe("findOrCreateHoldedContact", () => {
  const client = {
    name: "Cooperativa La Solana",
    taxId: "B22222222",
    contactEmail: "contacto@lasolana.es",
    contactPhone: null,
    holdedContactId: null,
  };

  it("rama 1: cache hit → no llama a Holded", async () => {
    const { findOrCreateHoldedContact } = await loadHolded();
    const spy = mockFetch({ status: 200, json: [] });
    vi.stubGlobal("fetch", spy);

    const result = await findOrCreateHoldedContact({
      ...client,
      holdedContactId: "ctc_cached_1",
    });

    expect(result.created).toBe(false);
    expect(result.contact.id).toBe("ctc_cached_1");
    expect(spy).not.toHaveBeenCalled();
  });

  it("rama 2: encuentra por taxId", async () => {
    const { findOrCreateHoldedContact } = await loadHolded();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        status: 200,
        json: [{ id: "ctc_taxid", code: "B22222222" }],
      }),
    );
    const result = await findOrCreateHoldedContact(client);
    expect(result.created).toBe(false);
    expect(result.contact.id).toBe("ctc_taxid");
  });

  it("rama 3: encuentra por email si taxId vacío", async () => {
    const { findOrCreateHoldedContact } = await loadHolded();
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call++;
        // 1ª llamada (taxId): array vacío
        if (call === 1)
          return {
            status: 200,
            ok: true,
            headers: { get: () => "application/json" },
            json: async () => [],
            text: async () => "",
          } as unknown as Response;
        // 2ª llamada (email): match
        return {
          status: 200,
          ok: true,
          headers: { get: () => "application/json" },
          json: async () => [
            { id: "ctc_email", email: "contacto@lasolana.es" },
          ],
          text: async () => "",
        } as unknown as Response;
      }),
    );
    const result = await findOrCreateHoldedContact(client);
    expect(result.created).toBe(false);
    expect(result.contact.id).toBe("ctc_email");
  });

  it("rama 4: crea si no encuentra por ningún criterio", async () => {
    const { findOrCreateHoldedContact } = await loadHolded();
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        call++;
        // GET búsqueda taxId y email → vacío
        if (!init?.method || init.method === "GET") {
          return {
            status: 200,
            ok: true,
            headers: { get: () => "application/json" },
            json: async () => [],
            text: async () => "",
          } as unknown as Response;
        }
        // POST creación
        expect(init.method).toBe("POST");
        return {
          status: 200,
          ok: true,
          headers: { get: () => "application/json" },
          json: async () => ({ id: "ctc_brand_new", status: 1 }),
          text: async () => "",
        } as unknown as Response;
      }),
    );
    const result = await findOrCreateHoldedContact(client);
    expect(result.created).toBe(true);
    expect(result.contact.id).toBe("ctc_brand_new");
    expect(result.contact.code).toBe("B22222222");
    expect(call).toBe(3); // taxId + email + create
  });
});
