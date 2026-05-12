# Subcarpetas estándar — AgroOps

Contenido inicial de las 4 subcarpetas obligatorias del Manifiesto SDD-SRS. Crear cada una como sub-página de la página principal AgroOps.

---

## 📄 Documentación

**Propósito:** specs funcionales detalladas, flujos de usuario, integraciones externas, glosario del dominio agro.

**Contenido inicial (placeholders a poblar conforme avanza el Sprint 1):**

- [ ] Glosario del dominio agro (NPTA, ROPO, SIGPAC, fitosanitario, MAPA registration, plazo seguridad, ATRIA, PAC, cuaderno de campo digital, EASA c0-c6, NPTA Drovinci, SORA, MTOM, deriva, etc.).
- [ ] Spec funcional del wizard de misión (HU-09) ampliando los criterios de aceptación del backlog.
- [ ] Flujo de firma en finca con conectividad intermitente (HU-15) — happy path + recovery.
- [ ] Integración AEMET — formato del payload OpenData, parsing, ventana segura para preflight (HU-13).
- [ ] Integración ENAIRE — formato del feed NOTAMs, cache strategy Redis, fallback (HU-12).
- [ ] Integración Holded — flujo de creación de factura + sync de estado + manejo de errores (HU-18..20).
- [ ] Integración DroneHub — formato de telemetría GeoJSON, captura post-vuelo (v1.1+).
- [ ] Export PAC — formato administración española para cuaderno digital obligatorio (HU-22).

**Regla del Manifiesto:** si una historia de usuario del backlog necesita más de un párrafo de contexto para implementarse, ese contexto va aquí como spec, no en un comentario del ticket.

---

## 🎨 Diseño

**Propósito:** wireframes, mockups, sistema de componentes, brandbook aplicado, flujos de interacción, assets visuales.

**Estado:** 🚧 **BLOQUEADO hasta cierre del Identity Sprint AgroOps.**

**Contenido inicial:**

- [ ] Identity Sprint AgroOps — los 6 pasos del SRS Design System.
  - [ ] Paso 1: Esencia del producto en una frase.
  - [ ] Paso 2: Tres adjetivos no genéricos.
  - [ ] Paso 3: 3 referencias visuales sí + 3 no.
  - [ ] Paso 4: Decisión de paleta (NO defaults).
  - [ ] Paso 5: Decisión de tipografía (NO Inter por defecto).
  - [ ] Paso 6: Template Test con alguien externo.
- [ ] Tema vertical AgroOps bajo SRS Design System (capa Themes, NO defaults Shadcn/Tailwind).
- [ ] Wireframes pantallas críticas (login, dashboard, wizard misión, mapa, preflight, firma albarán, vista cuaderno de campo).
- [ ] Sistema de componentes específico AgroOps (variantes por estado de misión, mapas, formularios complejos).
- [ ] Distinctiveness Audit pre-deploy (12 puntos del Design System — bloqueo de Fase 6 del Kickoff).

**Regla del Manifiesto:** ningún frontend se empieza sin al menos los wireframes de las pantallas críticas. La IA puede generar UI, pero necesita saber qué UI generar.

---

## 🔧 Desarrollo

**Propósito:** notas técnicas de implementación, snippets, bugs resueltos, dependencias, variables de entorno, guía de setup local.

**Contenido inicial:**

- [x] **Guía de setup local** — ver [README.md del repo](https://github.com/gutierrezbj/AgroOPs) + workdir `~/Library/CloudStorage/OneDrive-Personal/02.SR docs/SRS - AGRO/AgroOPs/`. Comando rápido:
  ```bash
  cd "~/Library/CloudStorage/OneDrive-Personal/02.SR docs/SRS - AGRO/AgroOPs"
  set -a && source .env.local && set +a
  make dev          # docker compose up + wait healthy
  pnpm dev          # Next.js dev server
  ```
- [x] **Variables de entorno documentadas** — ver `.env.example` del repo. Resumen: `DATABASE_URL` (Postgres+PostGIS local en 6170), `REDIS_URL` (6171), `AUTH_SECRET`, `AEMET_API_KEY`, `ENAIRE_NOTAM_FEED`, `HOLDED_API_KEY`, `HOLDED_BASE_URL`, `DRONEHUB_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SA99_REGISTRATION_KEY`, `BACKUP_S3_*`, `BACKUP_GPG_RECIPIENT`.
- [x] **Bug resuelto:** `audit/index.ts` líneas 36-37 fallaba `pnpm tsc --noEmit` con TS2322 (`null` vs `undefined`). Fix: cambiar `?? null` por `?? undefined` en fallback de `next/headers`. Reportado upstream en sub-página Discrepancias del bundle Sprint 0.
- [x] **Bug resuelto:** Conflicto puerto 6379 con `overwatch-redis-1`. Fix local: `docker-compose.override.yml` con sintaxis `!override` aplicando offset SRS +170 (Postgres en 6170, Redis en 6171, bind 127.0.0.1). Reportado upstream.
- [ ] Mapa de dependencias críticas (drizzle-orm, next-auth@beta, pg, redis, pdf-lib, maplibre-gl, etc.) con justificación por qué cada una.
- [ ] Patrones aplicados en el proyecto: Component / Action / Schema / Service por feature.
- [ ] Snippets reutilizables (logAudit helper, requireRole helper, generadores de códigos, etc.).
- [ ] Notas sobre Drizzle + PostGIS (cómo trabajar con geometry columns vía custom column type en `_shared.ts`).
- [ ] Workaround dotenv para drizzle-kit y seed (mientras no se arregle upstream).

**Regla del Manifiesto:** si un desarrollador nuevo (o un agente IA con contexto limpio) no puede levantar el proyecto y entender su estructura en menos de 30 minutos leyendo esta carpeta + el SDD, falta documentación.

---

## 📚 Recursos

**Propósito:** enlaces a repos, entornos, documentación externa, credenciales referenciadas.

**Contenido inicial:**

- **Repo GitHub:** [github.com/gutierrezbj/AgroOPs](https://github.com/gutierrezbj/AgroOPs)
- **Workdir local Mac Mini (bleu):** `~/Library/CloudStorage/OneDrive-Personal/02.SR docs/SRS - AGRO/AgroOPs/`
- **Dominio propuesto:** `agroops.agrom.es` (pendiente DNS Hostinger).
- **Documentación externa relevante:**
  - [AEMET OpenData](https://opendata.aemet.es/) — meteo.
  - [ENAIRE NOTAMs](https://aip.enaire.es/notam) — espacio aéreo.
  - [Holded API Docs](https://developers.holded.com/) — facturación.
  - [Drizzle ORM Docs](https://orm.drizzle.team/) — schema + queries.
  - [Next.js 16 docs](https://nextjs.org/docs) — App Router + Server Actions.
  - [Auth.js v5 docs](https://authjs.dev/) — auth.
  - [MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/) — mapas.
  - [PostGIS docs](https://postgis.net/docs/) — extensiones geoespaciales.
  - [SIGPAC](https://sigpac.mapama.gob.es/) — referencia de parcelas agrarias España.
- **Credenciales referenciadas (NO en texto plano):**
  - `.env.local` del repo (gitignored).
  - Holded API key — pendiente alta cuenta.
  - AEMET API key — pendiente registro.
  - Telegram bot SA99 — referenciado en infra SRS.
- **Material de investigación:**
  - SRS-BRIDGE.md del vertical SRS - AGRO (estado estratégico Spain + LATAM).
  - Plan v4 FitoLink (referencia para integración v1.2 vía API).
  - Informe PAC drones (regulación que AgroOps debe cumplir en HU-22).

**Regla del Manifiesto:** si alguien pregunta "dónde está X" y la respuesta es "en el Slack de hace 3 meses", esa información debería estar aquí.
