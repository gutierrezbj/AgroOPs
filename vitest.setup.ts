/**
 * AgroOps — Vitest setup
 *
 * Carga `.env.local` para tests que tocan DB (integración con Postgres+PostGIS
 * local en `127.0.0.1:6170`). Coherente con la lección del Sprint 0: ni
 * drizzle-kit ni tsx cargan `.env.local` automáticamente.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
