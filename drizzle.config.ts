import { defineConfig } from "drizzle-kit";

/**
 * AgroOps — Drizzle configuration
 *
 * Single-tenant per deployment (ver ADR-2). Sin RLS, sin tenant_id.
 */
export default defineConfig({
  schema: "./src/db/schema/*",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://agroops:agroops_dev@localhost:5432/agroops",
  },
  verbose: true,
  strict: true,
});
