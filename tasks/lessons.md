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

<!-- añadir entradas nuevas arriba de este comentario, en orden descendente por fecha -->
