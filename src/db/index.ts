/**
 * AgroOps — Drizzle client
 *
 * Cliente único de base de datos. Usar `db` desde Server Actions y services.
 *
 * Single-tenant per deployment (ADR-2). Sin tenant context.
 *
 * Lazy init (Next 16 build-time safety):
 *   El Pool y el cliente drizzle se crean al PRIMER USO (db.query/db.execute),
 *   NO al cargar el módulo. Razón: `pnpm build` en Docker hace "collect page
 *   data" que importa estos módulos sin DATABASE_URL del runtime. Si el
 *   throw fuera top-level, el build falla. Lazy → módulo se importa sin
 *   problema en build, y sólo crashea al hacer una query real (que NO
 *   ocurre durante `force-dynamic` API routes en build-time).
 */
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Schema = typeof schema;
type DrizzleDb = NodePgDatabase<Schema>;

let _pool: Pool | null = null;
let _db: DrizzleDb | null = null;

function getDb(): DrizzleDb {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL no está definida. Revisa .env.local (dev) o " +
        ".env.production (prod docker-compose).",
    );
  }
  _pool = new Pool({ connectionString });
  _db = drizzle(_pool, { schema });
  return _db;
}

/**
 * Proxy que difiere el init de Drizzle hasta el primer property access.
 * Para el llamador es transparente: `db.query.users.findFirst(...)` funciona
 * igual que antes; el coste extra del Proxy.get es despreciable.
 */
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export { schema };
export type Database = typeof db;
