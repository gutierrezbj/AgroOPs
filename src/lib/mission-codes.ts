/**
 * AgroOps — generador de códigos de misión y albarán
 *
 * Formato:
 *   - Misiones:  AGM-YYYY-NNNN  (p.ej. AGM-2026-0001)
 *   - Albaranes: ALB-YYYY-NNNN  (p.ej. ALB-2026-0001)
 *
 * El contador NNNN es secuencial dentro del año en curso. Se calcula consultando
 * el último código del año en DB y sumando 1. Para evitar races en alta
 * concurrente, envolver la inserción en una transacción con SELECT FOR UPDATE
 * o usar un secuencial Postgres dedicado (decisión postergada a la primera HU
 * que cree misiones).
 */
import { desc, like } from "drizzle-orm";
import { db } from "@/db";
import { missions } from "@/db/schema/missions";
import { albarans } from "@/db/schema/albarans";
import {
  MISSION_CODE_PREFIX,
  ALBARAN_CODE_PREFIX,
} from "@/lib/constants";

function currentYear(): string {
  return new Date().getFullYear().toString();
}

function formatCounter(n: number): string {
  return n.toString().padStart(4, "0");
}

export async function nextMissionCode(): Promise<string> {
  const year = currentYear();
  const prefix = `${MISSION_CODE_PREFIX}-${year}-`;

  const last = await db.query.missions.findFirst({
    where: like(missions.code, `${prefix}%`),
    orderBy: [desc(missions.code)],
    columns: { code: true },
  });

  const lastN = last ? parseInt(last.code.split("-")[2] ?? "0", 10) : 0;
  return `${prefix}${formatCounter(lastN + 1)}`;
}

export async function nextAlbaranCode(): Promise<string> {
  const year = currentYear();
  const prefix = `${ALBARAN_CODE_PREFIX}-${year}-`;

  const last = await db.query.albarans.findFirst({
    where: like(albarans.code, `${prefix}%`),
    orderBy: [desc(albarans.code)],
    columns: { code: true },
  });

  const lastN = last ? parseInt(last.code.split("-")[2] ?? "0", 10) : 0;
  return `${prefix}${formatCounter(lastN + 1)}`;
}
