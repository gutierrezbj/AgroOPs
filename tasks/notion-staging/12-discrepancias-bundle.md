# Discrepancias del bundle Sprint 0 — AgroOps

Reporte interno para mandar a **cowork** (o quien gestione los bundles `agroops-bootstrap` y `agroops-schema`) con las incoherencias detectadas durante la aplicación del Sprint 0 el 11 may 2026.

**Contexto:** el bundle se aplicó al repo `AgroOPs` siguiendo `agroops-bootstrap/SETUP.md` y `agroops-schema/SETUP.md`. Cowork generó esos bundles sin pasar por el Cuaderno Base de Proyectos SRS ni por el Catálogo de Infraestructura, lo que produjo varias incoherencias con la convención SRS. Algunas se resolvieron en local; otras requieren PR upstream al bundle para no repetirse en el próximo proyecto que lo use.

---

## #1 — `docker-compose.yml` viola la convención de puertos SRS

**Severidad:** Alta · **Bundle:** `agroops-bootstrap` · **Archivo:** `docker-compose.yml`

**Problema:**
```yaml
postgres:
  ports:
    - "5432:5432"   # ❌ bind 0.0.0.0 + sin offset SRS
redis:
  ports:
    - "6379:6379"   # ❌ bind 0.0.0.0 + sin offset SRS
```

El Catálogo de Infraestructura SRS dice literalmente: *"TODOS los puertos Docker deben ir en `127.0.0.1:PUERTO:INTERNO` (nunca `0.0.0.0`)"*. Además, cada proyecto recibe un offset (AgroOps = +170). Esos puertos colisionan con `overwatch-redis-1` que también usa `0.0.0.0:6379`.

**Mitigación local aplicada:** `docker-compose.override.yml` con sintaxis `!override` (necesaria; el merge default de compose extiende la lista en vez de reemplazarla):

```yaml
services:
  postgres:
    ports: !override
      - "127.0.0.1:6170:5432"
  redis:
    ports: !override
      - "127.0.0.1:6171:6379"
```

**Fix upstream propuesto:** sustituir el bloque `ports` del `docker-compose.yml` original por:

```yaml
postgres:
  ports:
    - "127.0.0.1:6170:5432"
redis:
  ports:
    - "127.0.0.1:6171:6379"
```

Y eliminar el override una vez fusionado.

---

## #2 — `drizzle.config.ts` fallback hardcoded a `localhost:5432` + no carga dotenv

**Severidad:** Media · **Bundle:** `agroops-bootstrap` · **Archivo:** `drizzle.config.ts`

**Problema:**
```ts
dbCredentials: {
  url: process.env.DATABASE_URL ?? "postgresql://agroops:agroops_dev@localhost:5432/agroops",
}
```

Si el operador olvida exportar `DATABASE_URL` (porque `.env.local` no se carga automáticamente), `drizzle-kit migrate` intenta conectar a `localhost:5432` y se queda colgado en timeout silencioso (puerto ya no está expuesto tras aplicar override del #1).

**Mitigación local aplicada:** `set -a && source .env.local && set +a` antes de `make db-migrate` y `make db-seed`.

**Fix upstream propuesto:**

```ts
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema/*",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://agroops:agroops_dev@localhost:6170/agroops",  // offset SRS +170
  },
  verbose: true,
  strict: true,
});
```

---

## #3 — `src/db/seed/index.ts` usa `dotenv/config` (carga `.env`) en vez de `.env.local`

**Severidad:** Media · **Bundle:** `agroops-schema` · **Archivo:** `src/db/seed/index.ts`

**Problema:** la primera línea es `import "dotenv/config"` que carga `.env` por defecto. Pero el bootstrap dice que las variables van en `.env.local` (correcto: el `.gitignore` del bundle excluye ambos). Resultado: `pnpm tsx src/db/seed/index.ts` falla con:

```
Error: DATABASE_URL no está definida. Revisa .env.local
```

**Mitigación local:** misma que #2 (`set -a; source .env.local; set +a`).

**Fix upstream propuesto:**

```ts
// Reemplazar `import "dotenv/config";` por:
import { config } from "dotenv";
config({ path: ".env.local" });
```

---

## #4 — `src/server/audit/index.ts` viola TypeScript strict (líneas 36-37)

**Severidad:** Baja · **Bundle:** `agroops-schema` · **Archivo:** `src/server/audit/index.ts`

**Problema:** asignaba `?? null` como fallback final a variables tipadas `string | undefined` (de `LogAuditInput.ipAddress?: string`):

```ts
ip ??= h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null;  // ❌ TS2322
ua ??= h.get("user-agent") ?? null;                              // ❌ TS2322
```

Eso viola la regla 1 del `CLAUDE.md`: *"TypeScript strict. Sin `any` salvo justificación documentada inline."*

**Fix aplicado en local** (commiteable):
```ts
ip ??= h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? undefined;
ua ??= h.get("user-agent") ?? undefined;
```

**Fix upstream propuesto:** idem, pero corregir aguas arriba para no repetir.

---

## #5 — Conteo de tablas inexacto en `agroops-schema/SETUP.md`

**Severidad:** Baja (documentación) · **Bundle:** `agroops-schema` · **Archivo:** `SETUP.md` línea 5

**Problema:** dice *"Schema Drizzle completo (12 tablas + 1 junction)"*. En realidad son **13 schemas** con **2 tablas junction-like** (`mission_parcels` puro M:M sin atributos extra, `mission_phyto` M:M con atributos de aplicación).

**Fix upstream propuesto:** *"Schema Drizzle completo (13 tablas, de las cuales 2 son junction: `mission_parcels` y `mission_phyto`)"*.

---

## #6 — Imagen `postgis/postgis:16-3.4` es amd64, no multi-arch

**Severidad:** Baja (performance) · **Bundle:** `agroops-bootstrap` · **Archivo:** `docker-compose.yml`

**Problema:** la imagen `postgis/postgis:16-3.4` es amd64-only. En Apple Silicon (M1/M2/M3/M4) corre vía Rosetta/QEMU, con warning recurrente y performance degradada:

```
The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8) and no specific platform was requested
```

**Fix upstream propuesto:** evaluar imágenes multi-arch:
- `postgis/postgis:16-3.4-alpine` (verificar disponibilidad arm64)
- `imresamu/postgis:16-3.4` (community multi-arch)
- Build propio FROM `postgres:16-alpine` + `apt install postgis` si es necesario.

---

## #7 — Falta `SETUP.md` en root del vertical SRS - AGRO/

**Severidad:** Info (proceso) · **Bundle:** (meta)

**Problema:** JuanCho pidió *"Lee el SETUP.md que voy a dejar en el root del proyecto"* pero ese archivo no existía en `SRS - AGRO/SETUP.md`. Sólo había dos SETUP.md dentro de los bundles. Si el patrón se mantiene (varios bundles aplicables en orden), conviene dejar uno orquestador en el root.

**Sugerencia:** crear `SRS - AGRO/SETUP.md` (no commiteable, documento de coordinación) apuntando a los dos bundles en el orden correcto, mencionando los pre-requisitos (Docker Desktop, pnpm vía corepack, Node 22) y la verificación previa contra el Catálogo de Infraestructura.

---

## Resumen ejecutivo para cowork

| # | Severidad | Bundle | Cambio mínimo upstream | Impacto si no se arregla |
|---|---|---|---|---|
| 1 | Alta | bootstrap | Bind 127.0.0.1 + offset SRS en docker-compose.yml | Conflicto seguro con otros proyectos en el parque (caso real: overwatch-redis-1) + violación documentada de la convención SRS |
| 2 | Media | bootstrap | Cargar dotenv `.env.local` en drizzle.config.ts | drizzle-kit migrate falla silenciosamente, debug confuso |
| 3 | Media | schema | dotenv `.env.local` en seed/index.ts | Seed falla en primer intento siempre |
| 4 | Baja | schema | `null` → `undefined` en audit/index.ts | `pnpm tsc --noEmit` falla con 2 errores TS strict |
| 5 | Baja | schema | Corregir conteo a "13 tablas" en SETUP.md | Confusión menor de documentación |
| 6 | Baja | bootstrap | Imagen multi-arch para PostGIS | Performance degradada en Apple Silicon, warning recurrente |
| 7 | Info | meta | Añadir orquestador SETUP.md en root vertical | Cada nuevo dev tiene que descubrir el orden de los bundles |

**Lección de proceso (más importante que los 7 anteriores):** los bundles se generaron sin consultar el Cuaderno Base de Proyectos ni el Catálogo de Infraestructura SRS. Resultado: AgroOps casi entra al parque con puertos en `0.0.0.0` y offset arbitrario. Cualquier futuro bundle debe partir de:

1. Lectura del Cuaderno Base.
2. Lectura del Catálogo de Infraestructura (offset libre, convención).
3. Lectura del Manifiesto SDD-SRS (stack aprobado, desviaciones como ADR).
4. Lectura del Cuaderno de Protocolos de la unidad relevante (AgroM en este caso).

Si esos 4 documentos no aparecen referenciados en el bundle, el bundle está "fuera de norma".

---

## Historial

- **v0.1 (11 may 2026):** reporte inicial tras Sprint 0 de AgroOps. Discrepancias 1–4 mitigadas en local, 5–7 documentadas para PR upstream.
