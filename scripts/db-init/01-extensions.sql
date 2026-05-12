-- =============================================================================
-- AgroOps — Inicialización de extensiones Postgres
-- Se ejecuta solo en el primer arranque del contenedor (volumen vacío)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
