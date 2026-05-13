# tasks/lessons.md — Lecciones aprendidas AgroOps

Registro vivo de aprendizajes durante el desarrollo. Actualizar siempre que algo rompa de forma no obvia, o se descubra un patrón mejor.

Formato por entrada:

```
## YYYY-MM-DD · Título corto
**Contexto:** qué intentábamos hacer.
**Qué rompió / qué se descubrió:** descripción.
**Solución / patrón adoptado:** qué se hace a partir de ahora.
**Referencia:** PR, ADR, archivo.
```

---

## 2026-05-11 · SDD cerrados antes de tocar código

**Contexto:** kickoff de AgroOps.
**Qué se descubrió:** la decisión inicial de multi-tenant nativo con RLS desde día 1 era over-engineering para el escenario real de negocio. AgroM es el único deployment operativo y futuros operadores asociados van por clone-and-deploy.
**Solución / patrón adoptado:** ADR-2 actualizado. Single-tenant per deployment. Sin `tenant_id`, sin RLS. Ahorro de 2-3 semanas en v1.
**Referencia:** SDD-04 → ADR-2, SDD-01 (Decisiones congeladas).

---

## 2026-05-12 · AEMET OpenData: arquitectura asíncrona en 2 fetches

**Contexto:** integración real AEMET para HU-13 (snapshot meteo en preflight).
**Qué se descubrió:** AEMET no devuelve los datos directamente. La respuesta inicial al endpoint `/api/...` con `api_key` en headers trae `{ estado: 200, datos: "URL_TEMPORAL", metadatos: "..." }`. Hay que hacer un **segundo fetch** a la `URL_TEMPORAL` para obtener el JSON real con la predicción.
**Solución / patrón adoptado:** envolver el flujo en `aemetFetch(url, apiKey)` que devuelve el JSON parseado, y un wrapper `fetchFromAemetMunicipio` que encadena los 2 fetches: indirecto → directo. El timeout (8s) cubre las 2 etapas.
**Referencia:** `src/server/integrations/aemet.ts` — `fetchFromAemetMunicipio`. Si en v1.1 añadimos resolución municipio desde lat/lng, mantener el mismo patrón.

---

## 2026-05-12 · Side-effect ANTES del gate: captura automática meteo en transitionMission

**Contexto:** state machine gate `approved → preflight` chequea `weatherSnapshot.flightSuitable !== false`. Si nunca lo capturamos antes, el gate siempre da warning soft (sin bloquear) y el operador llega a in_flight sin verificar meteo.
**Solución / patrón adoptado:** dentro de `transitionMission`, antes de cargar el `GateContext`, si `from === "approved" && to === "preflight" && !mission.weatherSnapshot`, **llamar AEMET, persistir el snapshot, releer la misión** y dejar que el gate decida con datos reales. Si AEMET falla, log + continuar (snapshot=null, warning soft, no bloqueo). Centroide se calcula con PostGIS `ST_Centroid` sobre la primera parcela; fallback Madrid centro si no hay parcelas. Aplicable a cualquier integración que dependa del estado destino (Holded en `completed → invoiced` seguirá el mismo patrón en HU-19).
**Referencia:** `src/features/missions/services.ts` — bloque "HU-13" en `transitionMission` + helper `getMissionPrimaryCentroid`.

---

## 2026-05-12 · Next.js 16 endurece `"use server"`: sólo async functions, nada más

**Contexto:** smoke visual del HU-04 tras añadir CSS estructural. JuanCho abre `/login` en el navegador y ve Runtime Error: *"A 'use server' file can only export async functions, found object."*
**Qué rompió:** los archivos action (`login.ts`, `create-drone.ts`, `update-drone.ts`, `archive-drone.ts`) declaraban `"use server"` y exportaban además de la función async: `interface XxxState`, `const initialXxxState`. En Next 15 estaba tolerado; Next 16 lo bloquea en runtime al cargar el chunk del cliente.
**Solución / patrón adoptado:** un archivo `"use server"` SÓLO exporta `export async function`. Para acompañar la función con types y estado inicial, **colocalizar** un archivo `<name>.types.ts` (sin `"use server"`) y poner ahí `XxxState` + `initialXxxState`. El archivo action importa `import type { XxxState } from "./<name>.types"` y el componente cliente importa `initialXxxState` del `.types.ts` directamente.
**Patrón canónico:**
```
features/<feat>/actions/
  <name>.ts          # "use server" + 1 export async function
  <name>.types.ts    # type State + const initialState
```
**Referencia:** [Next.js 16 docs — invalid-use-server-value](https://nextjs.org/docs/messages/invalid-use-server-value). Commit `0bbb6de` aplica el split a las 4 actions del repo. 64/64 tests siguen verde tras el cambio.

---

## 2026-05-12 · Auth.js v5 + cookies: `localhost` ≠ `127.0.0.1` para el cliente

**Contexto:** smoke test E2E del login HU-02 con curl.
**Qué rompió:** primer intento con `curl http://127.0.0.1:3000/api/auth/callback/credentials` devolvía `302 → http://localhost:3000/` (login fallaba). Causa: `AUTH_URL=http://localhost:3000` en `.env.local`, así que Auth.js setea cookies con domain `localhost`. Cuando llamas desde `127.0.0.1`, las cookies no aplican.
**Solución / patrón adoptado:** usar el mismo host en cliente que el del `AUTH_URL`. En tests E2E con curl o Playwright, mantener consistencia `localhost` ↔ `localhost`. Para Postgres (driver `pg`) la lección anterior pedía `127.0.0.1` (evitar dual-stack IPv6); para HTTP cookies, lo opuesto: pegar al host del AUTH_URL.
**Referencia:** smoke test 12 may 2026 → `GET /api/auth/session` retornó user completo (id/email/role admin) una vez alineado a `localhost`.

---

## 2026-05-12 · Next.js 16: `middleware.ts` deprecated → `proxy.ts`

**Contexto:** primer `pnpm dev` con HU-02. Warning en stdout: *"The middleware file convention is deprecated. Please use proxy instead."*
**Qué se descubrió:** Next.js 16 introduce `proxy.ts` como reemplazo de `middleware.ts`. La API y el `export default` son idénticos; sólo el nombre del archivo cambia. El runtime sigue aceptando `middleware.ts` con warning, internamente lo trata como `proxy.ts` (se ve en el log de request: `proxy.ts: 2ms`).
**Solución / patrón adoptado:** renombrar `src/middleware.ts` → `src/proxy.ts` cuando sea conveniente. El cambio es trivial y elimina el warning. **Aplazado** porque el sistema de permisos del agente lo malinterpretó como "remover capa de seguridad". Hacerlo a mano cuando JuanCho lo decida.
**Referencia:** [Next.js 16 docs — middleware to proxy](https://nextjs.org/docs/messages/middleware-to-proxy).

---

## 2026-05-12 · IPv4 explícito en DATABASE_URL/REDIS_URL (no `localhost`)

**Contexto:** primer Vitest contra Postgres local tras tests de HU-02 (services.ts).
**Qué rompió:** `connect ECONNREFUSED ::1:6170` antes que `connect ECONNREFUSED 127.0.0.1:6170`. Node.js / `pg` resuelve `localhost` a IPv6 dual-stack primero (`::1`), pero el bind del container Postgres es IPv4 only (`127.0.0.1:6170`).
**Solución / patrón adoptado:** usar `127.0.0.1` explícito en `DATABASE_URL` y `REDIS_URL` del `.env.local`. Patrón aplicable a cualquier connection string que ataque al Docker local en macOS. Aplica también a `bullmq`, `redis`, y cualquier cliente Node.
**Referencia:** `.env.local` del repo. No hace falta tocar el bundle porque allí el `.env.example` muestra `localhost` como template — cada operador ajusta su `.env.local` a `127.0.0.1` localmente.

---

## 2026-05-12 · Zod: orden de transform vs validators (email con trim)

**Contexto:** `loginSchema` aplicaba `.email()` antes de `.transform((v) => v.trim().toLowerCase())`.
**Qué rompió:** un input `"  JuanCho@SystemRapid.IO  "` falla `.email()` antes de llegar al trim.
**Solución / patrón adoptado:** usar `.transform(...).pipe(z.string().email(...))` para que la normalización suceda antes de la validación de formato:
```ts
email: z
  .string()
  .min(1, "Email requerido")
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.string().email("Email inválido")),
```
**Referencia:** `src/features/auth/schemas.ts`, test `loginSchema > normaliza email a lowercase y trimea`.

---

## 2026-05-12 · Auth.js v5 type augmentation: archivo módulo + import top-level

**Contexto:** extender `User`, `Session`, `JWT` en Auth.js v5 con `id`, `role`, `userId`.
**Qué rompió:** el primer intento usaba `import("@/...").UserRole` inline para mantener el archivo ambient (sin imports top-level). Resultado: TypeScript ve `declare module "next-auth"` como redefinición y pierde el módulo original (`NextAuthConfig`, `AuthError` desaparecen del namespace `next-auth`).
**Solución / patrón adoptado:** el `next-auth.d.ts` debe ser **módulo** (con al menos `import` o `export {};` top-level) para que `declare module` actúe como augmentation, no como redefinición. Los callbacks de `auth.config.ts` pueden necesitar type assertions explícitas (`token.role as UserRole`) si TS no resuelve la augmentation en cierto contexto.
**Referencia:** `src/types/next-auth.d.ts` (versión final con `import type { UserRole }` top-level + `export {};`). `src/auth.config.ts` líneas 27-31 con asserts explícitos.

---

## 2026-05-11 · Base de Proyectos SRS rige por encima de cualquier SETUP.md de bundle

**Contexto:** aplicación de los bundles `agroops-bootstrap` y `agroops-schema` al repo recién clonado.
**Qué se descubrió:** los bundles fueron generados por cowork sin consultar el Cuaderno Base de Proyectos SRS ni el Catálogo de Infraestructura. Resultado: el `docker-compose.yml` del bundle exponía Postgres en `0.0.0.0:5432` y Redis en `0.0.0.0:6379`, violando la convención SRS (`127.0.0.1:PUERTO:INTERNO`) y sin respetar el sistema de offsets (a AgroOps le tocaba +170). Choque inmediato con `overwatch-redis-1` que también ocupa el 6379. Yo seguí los SETUP.md a ciegas en lugar de consultar primero la Base de Proyectos.
**Solución / patrón adoptado:** **el Cuaderno Base de Proyectos** (`3407981f08ef816d9704db6dbff2299b`) **y el Catálogo de Infraestructura SRS** (`3217981f08ef81828e31edfcc9b78414`) **son source-of-truth, no los SETUP.md de los bundles.** Antes de aplicar cualquier bundle, leer ambos documentos. Si los SETUP.md / docker-compose / configs del bundle violan la convención SRS, flagear como bug del bundle desde el principio y mitigar en local; reportar upstream. Esta regla también aplica a artefactos generados por otros agentes (Cowork, sesiones previas de Claude Code, etc.) — no asumir que ya pasaron por la Base.
**Referencia:** memoria persistente del agente (`memory/consult-base-proyectos-primero.md`), sub-página Notion *Discrepancias del bundle Sprint 0* (staging en `tasks/notion-staging/12-discrepancias-bundle.md`).

---

## 2026-05-11 · Convención de puertos SRS = offset por proyecto + bind 127.0.0.1 (jamás 0.0.0.0)

**Contexto:** asignación de puertos para Postgres y Redis de AgroOps.
**Qué se descubrió:** la convención SRS es estricta y se documenta en la Sección 4 del Catálogo de Infraestructura. Cada proyecto recibe un offset (incremento de +10 por proyecto) que asigna 3xxx frontend, 4xxx API, 5xxx internal, 6xxx DBs. Todos los puertos van en `127.0.0.1:PUERTO:INTERNO`, jamás `0.0.0.0`. El healthcheck SRS alerta automáticamente si detecta puertos en `0.0.0.0`. A AgroOps le tocaba **+170** (tras ARGOS en +160 reservado el 9 may).
**Solución / patrón adoptado:**
- **Postgres host port:** `6170`
- **Redis host port:** `6171`
- **Frontend (Next.js dev):** `3170` (configurar con `next dev -p 3170` cuando se ajuste el package.json)
- **API split (futuro):** `4170` reservado
- **Workers (futuro):** `5170` reservado
- Registrar la entrada del proyecto en el Catálogo (offset, puertos, dominio, estado) al cerrar el Sprint 0 — es parte del Paso 6 del Cuaderno Base.
**Referencia:** `docker-compose.override.yml` del repo, `.env.local`, [Catálogo de Infraestructura SRS - Marzo 2026](https://www.notion.so/3217981f08ef81828e31edfcc9b78414) entrada AgroOps +170.

---

## 2026-05-11 · docker-compose override de `ports` necesita sintaxis `!override`

**Contexto:** corregir los puertos del `docker-compose.yml` del bundle sin modificar el bundle, vía `docker-compose.override.yml`.
**Qué rompió:** un override naïve con `ports: ["127.0.0.1:6171:6379"]` **extiende** la lista del original (`["6379:6379"]`) en vez de reemplazarla. Resultado: compose intenta bindear ambos puertos, conflicto con overwatch-redis-1 persiste.
**Solución / patrón adoptado:** usar la sintaxis `!override` de docker-compose v2.20+ para forzar reemplazo completo de la lista:
```yaml
services:
  redis:
    ports: !override
      - "127.0.0.1:6171:6379"
```
También existe `!reset` para borrar una propiedad y empezar de cero. `!override` es el correcto cuando hay nueva lista a aplicar.
**Referencia:** `docker-compose.override.yml` del repo, doc oficial [Docker compose merge — replacement](https://docs.docker.com/compose/multiple-compose-files/merge/).

---

## 2026-05-11 · drizzle-kit y tsx no cargan `.env.local` automáticamente

**Contexto:** correr `pnpm drizzle-kit migrate` y `pnpm tsx src/db/seed/index.ts` por primera vez.
**Qué rompió:**
- `drizzle.config.ts` del bundle tiene `dbCredentials.url = process.env.DATABASE_URL ?? "postgresql://...:5432/..."` y **no carga dotenv en ningún lado**. Sin `DATABASE_URL` en process.env, drizzle-kit usa el fallback (`localhost:5432`) que ya no existe (Postgres ahora en `localhost:6170`) y se cuelga en timeout silencioso.
- `src/db/seed/index.ts` usa `import "dotenv/config"` que carga **`.env`**, no `.env.local`. Falla con `Error: DATABASE_URL no está definida`.
**Solución / patrón adoptado:**
- Mientras se arregla el bundle aguas arriba, cargar `.env.local` en el shell antes de invocar make/pnpm:
  ```bash
  set -a && source .env.local && set +a && make db-migrate && make db-seed
  ```
- Fix permanente upstream: importar dotenv con `path: ".env.local"` tanto en `drizzle.config.ts` como en `src/db/seed/index.ts`. Documentado en *Discrepancias del bundle Sprint 0*.
**Referencia:** sub-página Notion *Discrepancias del bundle Sprint 0* (staging en `tasks/notion-staging/12-discrepancias-bundle.md`), Discrepancias #2 y #3.

---

## 2026-05-11 · pnpm crea proyectos con nombre lowercase obligatorio (npm spec)

**Contexto:** `pnpm create next-app@latest . ...` en directorio `AgroOPs/` (con mayúsculas).
**Qué rompió:** `Could not create a project called "AgroOPs" because of npm naming restrictions: name can no longer contain capital letters`. La directiva pasa al `package.json.name` y npm rechaza mayúsculas.
**Solución / patrón adoptado:** scaffoldear en un directorio temporal con nombre lowercase (`mktemp -d` + subdir `agroops`) y luego `rsync -a --exclude='.git/' "$TMP/agroops/" "$REAL/"` al directorio real (preservando el `.git` del clone). El nombre interno del package queda `agroops` (lowercase) aunque la carpeta del repo sea `AgroOPs/` (mixed case). Coherente porque GitHub no distingue mayúsculas en el repo name pero npm sí.
**Referencia:** flujo de Fase C en `tasks/notion-staging/02-checklist-kickoff-agroops.md`.

## 2026-05-12 · react-map-gl v8: import path `/maplibre` obligatorio

**Contexto:** HU-14 Fase A. Montar MapLibre GL JS dentro de Next.js 16 con `react-map-gl@8.1.1`.
**Qué se descubrió:** react-map-gl v8 no expone top-level. El paquete declara `exports` con tres rutas (`./mapbox`, `./maplibre`, `./mapbox-legacy`). Importar `from "react-map-gl"` falla con `Module not found`. La librería deja explícita la elección de engine porque la API de Mapbox v3 (paid) y MapLibre v5 (FOSS) diverge en `style` y `events`.
**Solución / patrón adoptado:** todos los imports cliente usan `from "react-map-gl/maplibre"`. Tipo `LngLatBoundsLike` y `MapMouseEvent` también vienen del subpath. Las layer specifications (`FillLayerSpecification`, `LineLayerSpecification`) sí vienen directo de `maplibre-gl` (el engine). El CSS de los controles (`maplibre-gl/dist/maplibre-gl.css`) se importa en el componente cliente; Next.js 16 lo permite sin warning.
**Referencia:** `src/features/map/components/MapView.tsx`. Estilo base CARTO Voyager (`https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json`) — gratis sin API key, attribution OSM + CARTO. Para producción comercial con > 100k map loads/mes evaluar Mapbox v3 o self-host tiles (CARTO Free permite uso comercial bajo).

---

## 2026-05-12 · API GeoJSON pública con auth gate ligero (sin RBAC fino)

**Contexto:** HU-14 Fase A. Exponer parcelas como FeatureCollection consumible por el cliente MapLibre.
**Qué se descubrió:** las parcelas ya están detrás del session-cookie de Auth.js, y el cliente MapLibre hace fetch desde el mismo origen. No hace falta RBAC granular (admin/piloto/operario/viewer) en estas rutas porque cualquier rol autenticado tiene legitimidad para ver el mapa global; el filtrado por cliente lo decide el query param `?clientId=`, no el rol. Distinto del audit log o de mutaciones, donde RBAC sí aplica.
**Solución / patrón adoptado:** API route con `export const dynamic = "force-dynamic"` + `auth()` gate genérico (401 si no hay sesión). El `parcelsToFeatureCollection()` vive en `features/map/services.ts` para tests puros sin DB. `Cache-Control: private, no-cache` en headers porque las parcelas mutan con cada ABM. Para NOTAMs el cache Redis (TTL 15 min, HU-12) ya da la performance; el HTTP no-cache mantiene el badge `source` (live/cache/stub) sincronizado en cada refresh del mapa.
**Referencia:** `src/app/api/parcels/geojson/route.ts`, `src/app/api/notams/geojson/route.ts`. Patrón replicable para v1.1 cuando expongamos `parcels/{id}.geojson` individual para PDF embed.

---

## 2026-05-12 · React imperative textarea population: dispatchEvent('input') después de .value =

**Contexto:** HU-14 Fase B. El `ParcelDrawMap` cierra el polígono y necesita poblar el `<textarea name="geometry">` del ParcelForm para que el form submit lo envíe al server action.
**Qué se descubrió:** React no observa cambios programáticos a `inputRef.current.value`. Asignar `geometryRef.current.value = JSON.stringify(...)` actualiza el DOM pero no dispara los listeners de React (controlled o uncontrolled con `defaultValue` + `onChange`). El form submit funciona porque lee el DOM final, pero cualquier listener `onInput`/`onChange` queda silenciado.
**Solución / patrón adoptado:** después de asignar `.value`, hacer `el.dispatchEvent(new Event("input", { bubbles: true }))`. Esto sincroniza React con el cambio nativo. Funciona porque React mete sus listeners en el bubble del root y SyntheticEvents normalizados se reactivan con eventos nativos `bubbles: true`. Patrón replicable para cualquier integración cliente→form (HU-15 firma → hidden input ya lo usa también).
**Referencia:** `src/features/parcels/components/ParcelForm.tsx` — `handlePolygonComplete()`.

---

## 2026-05-12 · Polygon ring closure con epsilon IEEE 754

**Contexto:** HU-14 Fase B. La función `buildClosedRing(vertices)` debe cerrar el anillo del polígono GeoJSON (primer punto = último). Surge la cuestión: si el usuario clickea exactamente el primer vertex como cierre, ¿cómo detectarlo?
**Qué se descubrió:** comparación directa con `===` falla por ruido de doble precisión IEEE 754. Sumar/restar latitudes en cascada de transformaciones (lng/lat de MapLibre → state setter → buildClosedRing) puede introducir errores del orden de 1e-15. Comparar con tolerancia es obligatorio.
**Solución / patrón adoptado:** epsilon 1e-9 (≈ 0.1 mm a la latitud de España). Suficientemente estricto para no aceptar clicks "vecinos" como cierre, suficientemente laxo para tolerar el ruido FP. Función `sameVertex(a, b)` con `Math.abs(a[0]-b[0]) < 1e-9 && Math.abs(a[1]-b[1]) < 1e-9`. Si el usuario hizo doble click cerca del origen, la lib decide cerrar; si clickeó claramente en otro sitio, no.
**Referencia:** `src/features/map/hooks/usePolygonDraw.ts` — `sameVertex()` + `buildClosedRing()`. 5 tests cubren los 4 casos: <3 puntos, anillo abierto, anillo ya cerrado, ruido FP.

---

## 2026-05-12 · Zod `.default()`: usar `z.input` no `z.infer` para tipo de input

**Contexto:** HU-18 integración Holded. La función `createHoldedContact` acepta `CreateHoldedContactInput` con campo `type` que en el schema tiene `.default("client")`. El caller debe poder omitir ese campo y dejar que Zod aplique el default.
**Qué rompió:** `type CreateHoldedContactInput = z.infer<typeof schema>` infiere el tipo **output** del parse, donde `.default()` ya aplicó el valor y `type` queda como required. TypeScript exige al caller pasarlo siempre. El test `createHoldedContact({ name: "X", code: "A1" })` falla con "Property 'type' is missing".
**Solución / patrón adoptado:** usar `z.input<typeof schema>` para tipos de entrada (donde `.default()` deja el campo opcional) y `z.infer` (alias de `z.output`) solo para resultados de `.parse()`. Regla general: si una función pública acepta input que pasa por Zod, expone `z.input`. Si devuelve datos validados, expone `z.infer`. Aplicable a todos los schemas Zod con `.default()`/`.transform()`.
**Referencia:** `src/server/integrations/holded.ts` — `CreateHoldedContactInput = z.input<typeof createHoldedContactInputSchema>`. Patrón replicable cuando un schema mezcla optional input + non-null output.

---

## 2026-05-12 · Tests con `vi.stubGlobal('fetch')` y módulo dinámico para env vars

**Contexto:** HU-18 tests Holded sin tocar el API real. Necesitamos mockear `global.fetch` y además que el módulo `holded.ts` relea `process.env.HOLDED_API_KEY` cada vez que el test cambia la env (p.ej. para el caso "not-configured" hay que tener `delete process.env.HOLDED_API_KEY` antes de importar).
**Qué se descubrió:** `holded.ts` captura `const HOLDED_API_KEY = process.env.HOLDED_API_KEY` en top-level. Esto se evalúa **una sola vez** cuando Vitest carga el módulo. Si en un test `delete process.env.HOLDED_API_KEY` antes de llamar a `holdedFetch`, la constante interna sigue conservando el valor previo (test pollution entre cases).
**Solución / patrón adoptado:** en los tests, importar el módulo **dinámicamente** después de configurar env: `vi.resetModules(); return import("./holded");` envuelto en helper `loadHolded()`. Esto fuerza a Vitest a re-evaluar el módulo y releer `process.env`. Combinado con `vi.stubGlobal("fetch", mockFn)` + `vi.restoreAllMocks()` en `afterEach` queda limpio. Patrón replicable para AEMET, ENAIRE, cualquier integración con env vars top-level.
**Referencia:** `src/server/integrations/holded.test.ts` — `loadHolded()` helper. La alternativa "no capturar en top-level y leer `process.env.X` en cada función" tiene peor performance y permite que un cambio runtime cambie comportamiento mid-request (no deseado en server actions Next.js). Mantener el patrón "top-level + dynamic import en test".

---

## 2026-05-12 · HoldedError tipado con `kind` discriminante (no string genérica)

**Contexto:** HU-18 cliente HTTP para Holded. Las llamadas pueden fallar por 6+ motivos: env no configurada, 401, 429, 5xx, timeout, JSON malformado. La UI necesita mostrar mensajes específicos: "configura .env.local" vs "revisa tu API key" vs "Holded está caído".
**Qué se descubrió:** una excepción genérica `throw new Error("Holded fail")` pierde el contexto; la UI sólo puede mostrar `.message`. Para hints accionables (ej. "configura tu .env") hay que distinguir motivos. Usar `instanceof` + `err.status` funciona pero es frágil porque "no configured" no tiene status HTTP.
**Solución / patrón adoptado:** clase `HoldedError extends Error` con campo readonly `kind: "not-configured" | "unauthorized" | "rate-limited" | "server-error" | "network" | "bad-response"`. La server action captura `if (err instanceof HoldedError) { return { reason: err.kind } }`. El cliente React mapea `reason` a hints específicos (función `reasonHint()` en HoldedSyncPanel). Patrón replicable para AEMET / ENAIRE / DroneHub: cada integración exporta su propia clase `XError` con su unión de `kind` literal.
**Referencia:** `src/server/integrations/holded.ts` — `HoldedError`, `pingHolded()` que mapea kind a result discriminado.

---

## 2026-05-12 · Side-effect ANTES del gate replicable para integraciones externas

**Contexto:** HU-19 disparo automático de factura en `transitionMission(completed→invoiced)`. Decidir dónde poner la llamada a Holded en el flujo del state machine: ¿antes del gate, dentro del gate, o después?
**Qué se descubrió:** el patrón ya usado en HU-13 (auto-captura meteo en `approved→preflight`) funciona también aquí. El side-effect debe ejecutarse ANTES del `evaluateGate`, así éste puede evaluar el resultado real (existe `invoices_ref` con status=`issued`) en vez de simular o asumir. Si Holded falla, la factura queda en `invoices_ref` con status=`error` y mensaje; el gate falla con error duro "no hay factura emitida" y bloquea la transición. El operador ve el error en la UI, corrige, y reintenta.
**Solución / patrón adoptado:** todo side-effect que dependa de integración externa al transitar (Holded, AEMET, en el futuro DroneHub, FitoLink) se hace ANTES de `evaluateGate`, los errores se loguean pero NO se re-throw del service (caller no quiere stack traces), y el gate decide con datos reales. El `GateContext` se amplía con campos opcionales (`albaranSigned`, `invoiceStatus`, `clientHoldedSynced`, etc.) que el service carga solo cuando son relevantes para la transición (no cargar `invoiceStatus` en `draft→planned`). Patrón replicable para HU-20 (sync invoice status) y futuras integraciones.
**Referencia:** `src/features/missions/services.ts` — bloque "HU-19" en `transitionMission`. `src/features/missions/state-machine.ts` — `GateContext.albaranSigned/invoiceStatus/clientHoldedSynced` opcionales.

---

## 2026-05-12 · InvoicingError tipado vs HoldedError: dos capas de errores con kind discriminante

**Contexto:** HU-19 facturación. Hay dos capas de errores posibles: (1) prerequisitos AgroOps no se cumplen (sin albarán, sin precio configurado, etc.) — detectables antes de tocar Holded; (2) Holded falla (API key inválida, rate limit, etc.) — solo después de la red. Ambos necesitan `kind` discriminante para que la UI muestre hints específicos.
**Qué se descubrió:** mezclar las dos capas en una sola clase pierde claridad. `HoldedError` ya tiene su jerarquía (`not-configured / unauthorized / rate-limited / server-error / network / bad-response`). Los errores AgroOps son distintos: `mission-not-completed`, `albaran-not-signed`, `client-not-synced`, `price-not-configured`, `area-missing`, `already-invoiced`, `mission-not-found`, `albaran-missing`. Si uso `HoldedError` para todo, mezclo "API key inválida" con "tu cliente no tiene holdedContactId" — pero la solución a uno (configurar env) no aplica al otro (sincronizar el cliente).
**Solución / patrón adoptado:** dos clases con `kind` propios. La server action captura ambas: `if (err instanceof InvoicingError) return { reason: err.kind }` y `if (err instanceof HoldedError) return { reason: err.kind }`. El tipo `DispatchInvoiceState.reason` es la UNIÓN de ambos kind + `forbidden` + `internal`. La función `reasonHint()` en el componente cliente mapea cada uno a un mensaje accionable distinto. Patrón replicable cuando un workflow tiene N capas de validación (entrada local + integración externa).
**Referencia:** `src/features/invoicing/services.ts` — `InvoicingError`. `src/features/invoicing/actions/dispatch-invoice.ts` — captura múltiple en orden de especificidad (Forbidden → Invoicing → Holded → Error genérico).

---

## 2026-05-12 · Pricing en env vars sin migración: tarifa por hectárea + IVA configurable

**Contexto:** HU-19 necesita calcular el subtotal de la factura. ¿De dónde viene el precio? Opciones: campo en `missions` (migración), tabla `pricing_tiers` (más migración + UI), env var.
**Qué se decidió:** v1.0 — env var global. `AGROOPS_PRICE_PER_HA_EUR=25.00` + `AGROOPS_INVOICE_VAT_PCT=21`. Si no hay precio configurado o es 0, la facturación lanza `InvoicingError("price-not-configured", ...)` antes de tocar Holded. El operador ve el error en la UI con hint "Define AGROOPS_PRICE_PER_HA_EUR en .env.local". Funciones `getPricePerHaEur()` y `getInvoiceVatPct()` en `lib/constants.ts` parsean con fall-safe (NaN → 0 para precio = no facturar; NaN → 21 para IVA = default seguro). REAGP (4% / 10%) soportado vía override de env.
**Por qué no migración v1.0:** AgroM es single-tenant y único operador. Una tarifa global cubre el 100% de los casos hasta v1.1 (cuando evaluemos override por cliente si John pide tarifas diferenciadas cooperativa vs individual). Migrar ahora a una tabla `pricing` añade complejidad sin valor inmediato. Si más adelante hace falta, el cambio es localizado (cambiar getPricePerHaEur por lookup en DB).
**Referencia:** `src/lib/constants.ts` — `getPricePerHaEur()`, `getInvoiceVatPct()`. `.env.example` documenta defaults. `src/features/invoicing/services.test.ts` cubre las distintas configuraciones.

---

## 2026-05-12 · SQL raw con db.execute para multi-join 8 tablas (cuaderno PAC)

**Contexto:** HU-21 vista derivada cuaderno de campo. Cruza missions × mission_parcels × parcels × clients × mission_phyto × phytosanitary_products × pilots × drones × albarans para producir una fila por aplicación-de-producto-en-parcela con 26 columnas.
**Qué se descubrió:** Drizzle declarative `db.select({...}).from(missions).leftJoin(...).leftJoin(...)` con 8 tablas y alias custom (`COALESCE(m.completed_at, m.started_at)`, `COALESCE(mph.area_covered_ha, mp.area_treated_ha, p.area_hectares)`) genera SQL menos legible y tipos `unknown` después de 4-5 joins. Mantener el shape de retorno tipado se vuelve fricción.
**Solución / patrón adoptado:** usar `db.execute<Record<string, unknown>>(sql\`SELECT ... FROM ... JOIN ... WHERE ...\`)` con interpolación segura de filtros vía template tags (`sql\`AND m.client_id = ${clientId}::uuid\``). Mantiene parametrización (no string concat) + control total del SQL + un único mapper `rowsToEntries` que devuelve `FieldNotebookEntry[]` tipado. Patrón replicable para futuros reportes complejos (cuaderno mensual, agregados por cliente, etc.). Compromiso: perdemos la garantía estática de que los `AS \"camelCase\"` aliases coinciden con `keyof FieldNotebookEntry` — vivible si los tests cubren el mapeo en runtime con datos seed.
**Referencia:** `src/features/field-notebook/services.ts` — `listFieldNotebookEntries`. Drizzle ORM v0.x soporta el patrón nativamente sin escape; los placeholders `${var}` siempre van como parámetros prepared statement.

---

## 2026-05-12 · pdf-lib paginación con computeRowHeight y truncateToWidth

**Contexto:** HU-22 export PDF cuaderno PAC. A4 landscape, 14 columnas, filas con altura variable (algunas tienen 2-3 líneas: cliente+CIF, parcela+SIGPAC, operador+ROPO+AESA). El PDF debe paginar correctamente con nueva página + repetir header de tabla.
**Qué se descubrió:** pdf-lib no tiene layout engine. Cada celda se dibuja con `page.drawText(x, y)` posición absoluta. Hay que calcular manualmente: (1) altura de cada fila según número de líneas máximas entre sus columnas; (2) si la siguiente fila no cabe antes de `MARGIN_BOTTOM + FOOTER_HEIGHT`, crear nueva página + redibujar header. Sin truncación los textos largos overflow el ancho de columna.
**Solución / patrón adoptado:**
- `computeRowHeight(entry)`: itera todas las columnas, cuenta `\n` y devuelve `12 + (maxLines-1)*9 + 4`.
- `truncateToWidth(text, font, maxWidth)`: bucle `while` que recorta caracteres hasta que `font.widthOfTextAtSize(text + "…", 7) <= maxWidth`. Suficientemente rápido para tablas <10k filas.
- Loop principal: `for (entry of entries) { rowHeight = compute(); if (y - rowHeight < limit) { footer + newPage + tableHeader }; drawRow(); y -= rowHeight; }`.
- Zebra striping: `i % 2 === 1` con `--surface` mezclado vía `rgb(0.965, 0.953, 0.918)` (color-mix no existe en pdf-lib; hardcodeamos el valor mezclado).
**Referencia:** `src/features/field-notebook/pdf.ts` — funciones `computeRowHeight`, `truncateToWidth`, `drawRow`. El patrón aplicable a cualquier reporte tabular largo. Si en el futuro nos pasamos a Puppeteer/Playwright PDF, este código se descarta — pero v1.0 pdf-lib es suficiente y mantiene cero deps del navegador.

---

## 2026-05-12 · Zod v3.25+ UUID strict (versión 1-8 obligatoria)

**Contexto:** HU-23 tests del schema de filtros audit log. Usé `"00000000-0000-0000-0000-000000000001"` como UUID de ejemplo y Zod lo rechazó: `Invalid UUID`.
**Qué se descubrió:** Zod v3.25+ valida UUIDs con pattern estricto que requiere bits de versión (1-8) + bits de variant (8/9/a/b) según RFC 4122 §4.1.1-2. El UUID `...0001` tiene el bit de versión a `0` (no asignado), por lo que es técnicamente inválido. La función `defaultRandom()` de Postgres y `randomUUID()` de Node generan UUIDs v4 correctos (4xxx-yxxx con y ∈ {8,9,a,b}), así que en producción no hay problema — solo en tests con UUIDs hardcoded "obvios".
**Solución / patrón adoptado:** en tests, usar UUIDs v4 válidos como `"550e8400-e29b-41d4-a716-446655440000"` o `crypto.randomUUID()`. Si necesitamos el nil UUID (`00000000-0000-0000-0000-000000000000`), Zod lo acepta como caso especial. Crear helper de test `makeTestUuid(seed: number)` si esto se repite. Replicar este patrón en futuros tests que generen UUIDs manualmente.
**Referencia:** `src/features/audit/services.test.ts` test "acepta entityType + entityId para timeline 1 misión". Aplicable a parcels, missions, clients, drones, pilots tests si se introducen.

---

## 2026-05-12 · Healthcheck endpoint público sin auth + degraded vs down

**Contexto:** HU-25 `/api/health`. Decidir: ¿requiere auth? ¿qué HTTP status devolver para "operativo pero AEMET no configurado"?
**Qué se decidió:** público sin auth. Los healthcheckers externos (Telegram cron, Uptime Robot, load balancer del proveedor cloud) no pueden manejar sesiones de Auth.js. La info devuelta es agregada (`status`, `version`, `uptime`, `checks[]`) sin secretos: si una integración no está configurada, decimos "Holded no configurado — facturación deshabilitada" sin exponer la API key. HTTP status binario: 503 si DB o Redis caídos (no operativo); 200 en cualquier otro caso, con `status: "degraded"` en el JSON si alguna integración opcional falta. Esto permite distinguir "down" (necesita acción urgente) de "degraded" (configuración pendiente, no urgente) sin saturar al operador.
**Solución / patrón adoptado:** cada check devuelve `{ name, status: ok|degraded|down, configured: bool, message?, latencyMs? }`. El agregado `runHealthCheck()` aplica reglas: DB/Redis down → status="down"; cualquier degraded → status="degraded"; todo verde → "ok". Patrón replicable cuando añadamos checks futuros (DroneHub v1.1, FitoLink v1.2). El endpoint reserva el HTTP 503 solo para "no operativo".
**Referencia:** `src/server/observability/health.ts`, `src/app/api/health/route.ts`. En Sprint 5, configurar Uptime Robot apuntando a `https://agroops.systemrapid.io/api/health` con escalado a Telegram si 503 persiste >5 min.

---

## 2026-05-12 · Backup bash idempotente con exit codes tipados + GitHub Action cron

**Contexto:** HU-24 backup automático Postgres. Necesita correr en cron diario sin supervisión y notificar fallos de forma identificable.
**Qué se descubrió:** `set -euo pipefail` en bash atrapa errores básicos pero no permite distinguir "DATABASE_URL no definida" de "pg_dump falló" de "upload S3 falló". Si el GitHub Action devuelve siempre exit 1 sin detalle, los logs son ruidosos al diagnosticar.
**Solución / patrón adoptado:** exit codes tipados 1-4 (1=prerequisito faltante, 2=pg_dump, 3=gpg, 4=S3 upload) con función `die "msg" $exit_code`. Función `require_cmd` y `require_env` para fail-fast en prerequisitos. Variables opcionales (`BACKUP_GPG_RECIPIENT`, `BACKUP_S3_BUCKET`) se chequean con `if [ -n "${VAR:-}" ]`. Rotación local con `find -mtime +$N -delete` siempre al final (idempotente, no rompe si no hay archivos viejos). GitHub Action separa los pasos para que el log diga exactamente cuál falló y dispara dos notificaciones Telegram (`if: success()` y `if: failure()`). Patrón replicable para future scripts (restore.sh, healthcheck-batch.sh, etc.).
**Referencia:** `scripts/backup.sh` + `.github/workflows/backup-daily.yml`. Documentación restore en CLAUDE.md sección "Backup & Restore".

---

## 2026-05-12 · Feature flag de runtime: integración Holded queda ready-to-plug

**Contexto:** decisión operativa post-EP-09: AgroM va a emitir facturas en Holded manualmente en v1.0. La integración (HU-18 + HU-19 + HU-20) queda implementada y con 349 tests, pero no se activa.
**Qué se descubrió:** la opción "borrar el código y meterlo cuando haga falta" es peor que dejarlo dormido — borraría 1500 LoC + 25 tests + 3 endpoints + UI ya pulida. La opción "dejar el código activo y exigir HOLDED_API_KEY válida" obliga a configurar Holded en producción aunque no se use. La tercera opción — feature flag de runtime — permite que la integración esté lista pero apagada por defecto.
**Solución / patrón adoptado:** env var `AGROOPS_INVOICING_MODE` (`manual` default | `holded`). Helper `getInvoicingMode()` + `isHoldedAutoDispatchEnabled()` en `lib/constants`. El gate `completed → invoiced` adapta su severidad según el modo (manual sólo exige albarán firmado; holded exige sync + factura issued). El side-effect en `transitionMission` se salta cuando modo manual. El `InvoicePanel` muestra mensaje explicativo + oculta botones de disparo. Patrón replicable para futuras integraciones opcionales (DroneHub v1.1, FitoLink v1.2). Coste de activación: cambiar 1 env + reiniciar. Sin migración de DB. Sin código nuevo.
**Lección general:** un feature flag de runtime es la herramienta correcta cuando una integración compleja debe estar lista pero no obligatoria. El "modo default fail-safe" (manual = no toca el API externo) protege producción de configuración incompleta.
**Referencia:** `src/lib/constants.ts` (`getInvoicingMode`, `isHoldedAutoDispatchEnabled`), `src/features/missions/state-machine.ts` (gate dependiente de `ctx.invoicingMode`), `src/features/missions/services.ts` (`transitionMission` skip side-effect), `src/features/invoicing/components/InvoicePanel.tsx` (`isManualMode` rama UI). CLAUDE.md sección "Facturación: modo manual vs Holded" documenta el switch.

---

## 2026-05-13 · Playwright `webServer` auto-arranque + services GitHub Actions

**Contexto:** Sprint 5 setup E2E. Decidir cómo arranca el dev server para los tests (local + CI) y cómo se provee PostGIS+Redis en CI.
**Qué se descubrió:**
- En local: si exiges al usuario tener `pnpm dev` corriendo antes de `pnpm e2e`, la fricción aumenta y el setup-2-pasos se vuelve fácil de olvidar. Mejor `webServer` config en `playwright.config.ts` que ejecuta `pnpm next dev` y espera al `url` para responder. `reuseExistingServer: !IS_CI` reusa el server local si ya está arriba (iteración rápida) y arranca uno limpio en CI.
- En CI: GitHub Actions soporta `services:` con cualquier imagen Docker. Usar `postgis/postgis:16-3.4` directamente como service en vez de docker-compose evita un step extra. Health-check del service garantiza que Postgres esté ready antes del primer step. Las extensiones (`CREATE EXTENSION postgis...`) se aplican con `psql` en un step manual porque la imagen `postgis/postgis` activa la extensión en la DB `template_postgis`, no automáticamente en `agroops`.
- Timeout: el primer build de Next.js 16 dev puede tardar 30+ segundos. `timeout: 120_000` en webServer config evita falsos negativos. Para E2E individuales `timeout: 30_000` + `expect.timeout: 7_000` cubre la mayoría de waits sin colgar.
**Solución / patrón adoptado:** `playwright.config.ts` con webServer + reuseExistingServer condicional a `CI`. GitHub Action separa steps Install browsers → Apply extensions → Migrate → Seed → Typecheck+Vitest → Build → E2E → Upload artifact on failure. El artifact incluye `playwright-report/` + `test-results/` (screenshots, videos, traces) con retention de 14 días.
**Referencia:** `playwright.config.ts`, `.github/workflows/e2e.yml`. Patrón aplicable a cualquier proyecto Next + Postgres+PostGIS. La imagen `postgis/postgis:16-3.4` está pinneada por reproducibilidad — bumpear conscientemente si Postgres mayor o PostGIS minor.

---

<!-- añadir entradas nuevas arriba de este comentario, en orden descendente por fecha -->
