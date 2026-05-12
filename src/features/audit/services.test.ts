/**
 * AgroOps — audit feature tests (HU-23)
 *
 * Tests puros sobre el schema de filtros y el helper `formatAuditAction`.
 * El service `listAuditLog` toca DB; su test E2E queda para Sprint 5
 * hardening con Playwright + DB seedeada.
 */
import { describe, expect, it } from "vitest";
import {
  auditLogFiltersSchema,
  parseAuditFiltersFromSearchParams,
} from "./schemas";
import {
  KNOWN_AUDIT_ACTIONS,
  KNOWN_ENTITY_TYPES,
  formatAuditAction,
} from "./services";

describe("auditLogFiltersSchema", () => {
  it("acepta filtros vacíos con limit default 100", () => {
    const parsed = auditLogFiltersSchema.parse({});
    expect(parsed.limit).toBe(100);
  });

  it("coerce limit desde string (URLSearchParams)", () => {
    const parsed = auditLogFiltersSchema.parse({ limit: "50" });
    expect(parsed.limit).toBe(50);
  });

  it("rechaza limit > 500", () => {
    const result = auditLogFiltersSchema.safeParse({ limit: 1000 });
    expect(result.success).toBe(false);
  });

  it("rechaza dateFrom > dateTo", () => {
    const result = auditLogFiltersSchema.safeParse({
      dateFrom: "2026-06-01",
      dateTo: "2026-05-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/anterior/);
    }
  });

  it("rechaza action y actionPrefix juntos", () => {
    const result = auditLogFiltersSchema.safeParse({
      action: "mission.created",
      actionPrefix: "mission.",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/no ambos/);
    }
  });

  it("acepta entityType + entityId para timeline 1 misión", () => {
    // UUID v4 válido (4xxx versión + 8/9/a/b variant)
    const sampleUuid = "550e8400-e29b-41d4-a716-446655440000";
    const parsed = auditLogFiltersSchema.parse({
      entityType: "mission",
      entityId: sampleUuid,
    });
    expect(parsed.entityType).toBe("mission");
    expect(parsed.entityId).toBe(sampleUuid);
  });

  it("rechaza UUID inválido en userId/entityId", () => {
    expect(auditLogFiltersSchema.safeParse({ userId: "not-uuid" }).success).toBe(
      false,
    );
    expect(auditLogFiltersSchema.safeParse({ entityId: "abc" }).success).toBe(
      false,
    );
  });
});

describe("parseAuditFiltersFromSearchParams", () => {
  it("parsea URLSearchParams correctamente", () => {
    const params = new URLSearchParams("dateFrom=2026-05-01&entityType=mission");
    const result = parseAuditFiltersFromSearchParams(params);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filters.dateFrom).toBe("2026-05-01");
      expect(result.filters.entityType).toBe("mission");
    }
  });

  it("ignora params vacíos en plain object", () => {
    const result = parseAuditFiltersFromSearchParams({
      dateFrom: "2026-05-01",
      entityType: "",
      userId: undefined,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filters.dateFrom).toBe("2026-05-01");
      expect(result.filters.entityType).toBeUndefined();
    }
  });

  it("devuelve error legible si validación falla", () => {
    const result = parseAuditFiltersFromSearchParams({ limit: "9999" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
  });
});

describe("formatAuditAction", () => {
  it("mapea acciones conocidas a labels humanos", () => {
    expect(formatAuditAction("mission.created")).toBe("Misión creada");
    expect(formatAuditAction("albaran.signed")).toBe("Albarán firmado");
    expect(formatAuditAction("client.holded_linked")).toBe(
      "Cliente enlazado con Holded",
    );
    expect(formatAuditAction("mission.invoice_dispatched")).toBe(
      "Factura disparada",
    );
  });

  it("retorna texto original si action no está mapeado", () => {
    expect(formatAuditAction("custom.unknown_verb")).toBe("custom.unknown_verb");
  });

  it("todas las KNOWN_AUDIT_ACTIONS tienen label humano", () => {
    for (const action of KNOWN_AUDIT_ACTIONS) {
      const label = formatAuditAction(action);
      // No debería devolver el action raw — debe tener label propio
      expect(label).not.toBe(action);
    }
  });
});

describe("KNOWN_ENTITY_TYPES", () => {
  it("cubre todas las entidades mutables del sistema", () => {
    expect(KNOWN_ENTITY_TYPES).toContain("mission");
    expect(KNOWN_ENTITY_TYPES).toContain("albaran");
    expect(KNOWN_ENTITY_TYPES).toContain("client");
    expect(KNOWN_ENTITY_TYPES).toContain("drone");
    expect(KNOWN_ENTITY_TYPES).toContain("pilot");
    expect(KNOWN_ENTITY_TYPES).toContain("parcel");
    expect(KNOWN_ENTITY_TYPES).toContain("phyto_product");
    expect(KNOWN_ENTITY_TYPES).toContain("invoice");
  });
});
