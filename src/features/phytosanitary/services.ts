/**
 * AgroOps — phytosanitary services (HU-08)
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  phytosanitaryProducts,
  type NewPhytosanitaryProduct,
  type PhytosanitaryProduct,
} from "@/db/schema/phytosanitary";
import type {
  CreatePhytoProductInput,
  ListPhytoFilters,
  UpdatePhytoProductInput,
} from "./schemas";

function toDbValues(
  input: CreatePhytoProductInput | UpdatePhytoProductInput,
): Partial<NewPhytosanitaryProduct> {
  const out: Partial<NewPhytosanitaryProduct> = {};
  if (input.commercialName !== undefined) out.commercialName = input.commercialName;
  if (input.activeIngredient !== undefined) out.activeIngredient = input.activeIngredient;
  if (input.mapaRegistration !== undefined) out.mapaRegistration = input.mapaRegistration;
  if (input.formulation !== undefined) out.formulation = input.formulation;
  if (input.lotNumber !== undefined) out.lotNumber = input.lotNumber;
  if (input.expiresAt !== undefined) out.expiresAt = input.expiresAt;
  if (input.recommendedDoseValue !== undefined) {
    out.recommendedDoseValue =
      input.recommendedDoseValue == null
        ? null
        : input.recommendedDoseValue.toFixed(3);
  }
  if (input.recommendedDoseUnit !== undefined) {
    out.recommendedDoseUnit = input.recommendedDoseUnit;
  }
  if (input.safetyPeriodDays !== undefined) {
    out.safetyPeriodDays =
      input.safetyPeriodDays == null ? null : input.safetyPeriodDays.toFixed(1);
  }
  if (input.active !== undefined) out.active = input.active;
  if (input.notes !== undefined) out.notes = input.notes;
  return out;
}

export async function listPhytoProducts(
  filters: ListPhytoFilters = {},
): Promise<PhytosanitaryProduct[]> {
  const conditions = [];
  if (typeof filters.active === "boolean") {
    conditions.push(eq(phytosanitaryProducts.active, filters.active));
  }
  return db
    .select()
    .from(phytosanitaryProducts)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(
      asc(phytosanitaryProducts.commercialName),
      asc(phytosanitaryProducts.lotNumber),
    );
}

export async function getPhytoProduct(
  id: string,
): Promise<PhytosanitaryProduct | null> {
  const result = await db.query.phytosanitaryProducts.findFirst({
    where: eq(phytosanitaryProducts.id, id),
  });
  return result ?? null;
}

export async function createPhytoProduct(
  input: CreatePhytoProductInput,
): Promise<PhytosanitaryProduct> {
  const values = toDbValues(input) as NewPhytosanitaryProduct;
  const [created] = await db
    .insert(phytosanitaryProducts)
    .values(values)
    .returning();
  if (!created) {
    throw new Error("createPhytoProduct: inserción no devolvió fila");
  }
  return created;
}

export async function updatePhytoProduct(
  id: string,
  input: UpdatePhytoProductInput,
): Promise<PhytosanitaryProduct | null> {
  const values = toDbValues(input);
  if (Object.keys(values).length === 0) {
    return getPhytoProduct(id);
  }
  const [updated] = await db
    .update(phytosanitaryProducts)
    .set(values)
    .where(eq(phytosanitaryProducts.id, id))
    .returning();
  return updated ?? null;
}

export async function archivePhytoProduct(
  id: string,
): Promise<PhytosanitaryProduct | null> {
  const [updated] = await db
    .update(phytosanitaryProducts)
    .set({ active: false })
    .where(eq(phytosanitaryProducts.id, id))
    .returning();
  return updated ?? null;
}

export async function restorePhytoProduct(
  id: string,
): Promise<PhytosanitaryProduct | null> {
  const [updated] = await db
    .update(phytosanitaryProducts)
    .set({ active: true })
    .where(eq(phytosanitaryProducts.id, id))
    .returning();
  return updated ?? null;
}

/**
 * Helper UI: clasifica el lote según su fecha de caducidad.
 * - expired: ya vencido
 * - warning: caduca en ≤ 30 días
 * - ok: caduca en > 30 días
 */
export interface PhytoExpiryStatus {
  daysToExpiry: number;
  severity: "expired" | "warning" | "ok";
}

export function evaluateExpiry(
  product: PhytosanitaryProduct,
  today: Date = new Date(),
): PhytoExpiryStatus {
  const todayMs = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const ts = Date.parse(`${product.expiresAt}T00:00:00Z`);
  const days = Math.floor((ts - todayMs) / (1000 * 60 * 60 * 24));
  let severity: PhytoExpiryStatus["severity"];
  if (days < 0) severity = "expired";
  else if (days <= 30) severity = "warning";
  else severity = "ok";
  return { daysToExpiry: days, severity };
}
