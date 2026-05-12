/**
 * AgroOps — invoicing tests (HU-19)
 *
 * Aquí solo testeamos los aspectos PUROS del feature:
 * - `InvoicingError` con kind discriminante.
 * - Las constantes de pricing (`getPricePerHaEur`, `getInvoiceVatPct`)
 *   con distintos valores de env.
 *
 * Los tests de integración full (carga misión + albarán + cliente + Holded
 * + persist invoice_ref) requieren DB de test. En v1.0 los dejamos como
 * smoke test manual desde la UI (botón "Disparar facturación" en
 * /dashboard/missions/[id]). En Sprint 5 (hardening) se añadirá un
 * test E2E con Playwright + base de test seedeada.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InvoicingError } from "./services";
import {
  getInvoiceVatPct,
  getInvoicingMode,
  getPricePerHaEur,
  isHoldedAutoDispatchEnabled,
} from "@/lib/constants";

const ORIGINAL_PRICE = process.env.AGROOPS_PRICE_PER_HA_EUR;
const ORIGINAL_VAT = process.env.AGROOPS_INVOICE_VAT_PCT;
const ORIGINAL_MODE = process.env.AGROOPS_INVOICING_MODE;

afterEach(() => {
  if (ORIGINAL_PRICE === undefined) {
    delete process.env.AGROOPS_PRICE_PER_HA_EUR;
  } else {
    process.env.AGROOPS_PRICE_PER_HA_EUR = ORIGINAL_PRICE;
  }
  if (ORIGINAL_VAT === undefined) {
    delete process.env.AGROOPS_INVOICE_VAT_PCT;
  } else {
    process.env.AGROOPS_INVOICE_VAT_PCT = ORIGINAL_VAT;
  }
  if (ORIGINAL_MODE === undefined) {
    delete process.env.AGROOPS_INVOICING_MODE;
  } else {
    process.env.AGROOPS_INVOICING_MODE = ORIGINAL_MODE;
  }
});

describe("InvoicingError", () => {
  it("se identifica con instanceof y conserva kind", () => {
    const err = new InvoicingError("client-not-synced", "Cliente sin Holded");
    expect(err).toBeInstanceOf(InvoicingError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("InvoicingError");
    expect(err.kind).toBe("client-not-synced");
    expect(err.message).toBe("Cliente sin Holded");
  });

  it("acepta todos los kinds documentados", () => {
    const kinds: InvoicingError["kind"][] = [
      "mission-not-found",
      "mission-not-completed",
      "albaran-missing",
      "albaran-not-signed",
      "client-not-synced",
      "price-not-configured",
      "area-missing",
      "already-invoiced",
    ];
    for (const kind of kinds) {
      const err = new InvoicingError(kind, `msg ${kind}`);
      expect(err.kind).toBe(kind);
    }
  });
});

describe("getPricePerHaEur", () => {
  beforeEach(() => {
    delete process.env.AGROOPS_PRICE_PER_HA_EUR;
  });

  it("devuelve 0 sin env (señaliza 'no configurado')", () => {
    expect(getPricePerHaEur()).toBe(0);
  });

  it("parsea decimales válidos", () => {
    process.env.AGROOPS_PRICE_PER_HA_EUR = "25.50";
    expect(getPricePerHaEur()).toBe(25.5);
  });

  it("devuelve 0 si el valor es NaN o ≤ 0", () => {
    process.env.AGROOPS_PRICE_PER_HA_EUR = "abc";
    expect(getPricePerHaEur()).toBe(0);
    process.env.AGROOPS_PRICE_PER_HA_EUR = "0";
    expect(getPricePerHaEur()).toBe(0);
    process.env.AGROOPS_PRICE_PER_HA_EUR = "-5";
    expect(getPricePerHaEur()).toBe(0);
  });
});

describe("getInvoiceVatPct", () => {
  beforeEach(() => {
    delete process.env.AGROOPS_INVOICE_VAT_PCT;
  });

  it("default 21 sin env (régimen general España)", () => {
    expect(getInvoiceVatPct()).toBe(21);
  });

  it("acepta valores 0..100", () => {
    process.env.AGROOPS_INVOICE_VAT_PCT = "0";
    expect(getInvoiceVatPct()).toBe(0);
    process.env.AGROOPS_INVOICE_VAT_PCT = "4";
    expect(getInvoiceVatPct()).toBe(4); // REAGP
    process.env.AGROOPS_INVOICE_VAT_PCT = "10";
    expect(getInvoiceVatPct()).toBe(10);
    process.env.AGROOPS_INVOICE_VAT_PCT = "100";
    expect(getInvoiceVatPct()).toBe(100);
  });

  it("falla seguro a 21 si NaN o fuera de rango", () => {
    process.env.AGROOPS_INVOICE_VAT_PCT = "abc";
    expect(getInvoiceVatPct()).toBe(21);
    process.env.AGROOPS_INVOICE_VAT_PCT = "-5";
    expect(getInvoiceVatPct()).toBe(21);
    process.env.AGROOPS_INVOICE_VAT_PCT = "150";
    expect(getInvoiceVatPct()).toBe(21);
  });
});

describe("getInvoicingMode", () => {
  beforeEach(() => {
    delete process.env.AGROOPS_INVOICING_MODE;
  });

  it("default 'manual' sin env (v1.0 fail-safe)", () => {
    expect(getInvoicingMode()).toBe("manual");
    expect(isHoldedAutoDispatchEnabled()).toBe(false);
  });

  it("acepta 'holded' explícito case-insensitive con trim", () => {
    process.env.AGROOPS_INVOICING_MODE = "holded";
    expect(getInvoicingMode()).toBe("holded");
    expect(isHoldedAutoDispatchEnabled()).toBe(true);

    process.env.AGROOPS_INVOICING_MODE = "HOLDED";
    expect(getInvoicingMode()).toBe("holded");

    process.env.AGROOPS_INVOICING_MODE = "  holded  ";
    expect(getInvoicingMode()).toBe("holded");
  });

  it("cualquier otro valor cae en 'manual' (fail-safe)", () => {
    process.env.AGROOPS_INVOICING_MODE = "auto";
    expect(getInvoicingMode()).toBe("manual");

    process.env.AGROOPS_INVOICING_MODE = "yes";
    expect(getInvoicingMode()).toBe("manual");

    process.env.AGROOPS_INVOICING_MODE = "";
    expect(getInvoicingMode()).toBe("manual");

    process.env.AGROOPS_INVOICING_MODE = "manual";
    expect(getInvoicingMode()).toBe("manual");
  });
});

describe("cálculo subtotal + IVA (pure)", () => {
  // Replicamos el cálculo que hace createInvoiceForMission para verificarlo
  // sin necesidad de DB.
  function calcInvoice(areaHa: number, pricePerHa: number, vatPct: number) {
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const subtotal = round2(pricePerHa * areaHa);
    const vat = round2((subtotal * vatPct) / 100);
    return { subtotal, vat, total: round2(subtotal + vat) };
  }

  it("4.5 ha × 25 €/ha + 21% IVA → 112.50 + 23.63 = 136.13", () => {
    const r = calcInvoice(4.5, 25, 21);
    expect(r.subtotal).toBe(112.5);
    expect(r.vat).toBe(23.63);
    expect(r.total).toBe(136.13);
  });

  it("10 ha × 30 €/ha + 0% IVA (REAGP) → 300 + 0 = 300", () => {
    const r = calcInvoice(10, 30, 0);
    expect(r.subtotal).toBe(300);
    expect(r.vat).toBe(0);
    expect(r.total).toBe(300);
  });

  it("redondea a 2 decimales banker-friendly", () => {
    const r = calcInvoice(0.333, 9.99, 21);
    // 0.333 * 9.99 = 3.32667 → 3.33
    expect(r.subtotal).toBe(3.33);
    // 3.33 * 0.21 = 0.6993 → 0.70
    expect(r.vat).toBe(0.7);
    expect(r.total).toBe(4.03);
  });
});
