/**
 * AgroOps — Drizzle client
 *
 * Cliente único de base de datos. Usar `db` desde Server Actions y services.
 *
 * Single-tenant per deployment (ADR-2). Sin tenant context.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida. Revisa .env.local");
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
export { schema };
export type Database = typeof db;
