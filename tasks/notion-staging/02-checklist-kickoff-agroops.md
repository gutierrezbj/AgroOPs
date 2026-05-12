# 🚀 Checklist de Kickoff — AgroOps

> Duplicado de [PLANTILLA] Checklist de Kickoff — Protocolo de Inicio de Proyecto SRS (`3257981f08ef8191b135d5da2bc759d1`).
> Aplicado retroactivamente el 11 may 2026 sobre estado de Sprint 0 ya completado.

**Estado global:** Fase 0 ✅ · Fase 1 ✅ · Fase 2 ✅ (SDDs documentados en CLAUDE.md + DESIGN.md, formalización Notion en curso) · Fase 3 ✅ · Fase 4 🟡 (Sprint 0 cerrado, MVP Sprint 1+ en desarrollo) · Fase 5–7 ⛔ pendientes

---

# FASE 0 — Ideación y Brainstorming ✅

- [x] Chat de brainstorming: definir problema, audiencia, propuesta de valor → SDD-01 cubre.
- [x] Identificar si ya existe solución interna → ninguna SRS, ni externa accesible (VisualNacert sólo cubre satelital sin operación dron).
- [x] Generar documento resumen del brainstorming → ver SDD-01 + CLAUDE.md "Producto" + SRS-BRIDGE.md.
- [x] Almacenar documentos generados en Notion → este checklist + sub-páginas SDD-01..08.
- [x] Decisión GO / NO-GO → GO. Producto SRS con primer deployment AgroM, Sprint 0 cerrado.

---

# FASE 1 — Setup del Proyecto en Notion ✅ (parcial — el agente lo intentó automatizar 11 may noche)

- [x] Crear página principal del proyecto bajo la sección correspondiente → este es el contexto donde vive.
- [x] Escribir overview del proyecto → ver página principal AgroOps.
- [x] Crear las 8 sub-páginas SDD (SDD-01 a SDD-08) con nombres estándar → ver índice SDD en página principal.
- [x] Crear subcarpetas estándar: Documentación, Diseño, Desarrollo, Recursos → creadas como sub-páginas placeholder.
- [x] Agregar índice SDD en la página principal con enlaces a cada sección → ver overview.

> **Nota:** Fase 1 se completó retroactivamente el 11 may 2026 noche. El bundle del Sprint 0 generado por cowork omitió este paso. Corregido tras feedback del usuario "para eso hicimos un base de proyectos".

---

# FASE 2 — Documentación SDD ✅

- [x] SDD-01 — Definición del Problema → sub-página SDD-01.
- [x] SDD-02 — Alcance y Límites → sub-página SDD-02 (épicas EP-01 a EP-09 in-scope, multi-tenant SaaS out-of-scope por ADR-2).
- [x] SDD-03 — Arquitectura Técnica → sub-página SDD-03 (stack + modelo de datos Drizzle 13 tablas).
- [x] SDD-04 — Decisiones Técnicas / ADRs → sub-página SDD-04 (ADR-1 a ADR-10 ya cerrados en CLAUDE.md).
- [x] SDD-05 — Backlog Inicial → sub-página SDD-05 (mirror de tasks/todo.md, 25 HUs en 5 sprints).
- [x] SDD-06 — Reglas de Desarrollo → sub-página SDD-06 (mirror de "Reglas no negociables" del CLAUDE.md).
- [x] SDD-07 — Plan de Testing → sub-página SDD-07 (Vitest unit + Playwright E2E críticos, cobertura 80% features/).
- [x] SDD-08 — Plan de Despliegue → sub-página SDD-08 (Mac local → push → CI → prod único, sin staging).
- [x] Revisión cruzada: las 8 secciones son coherentes entre sí → coherentes con CLAUDE.md vivo en el repo.

---

# FASE 3 — Reserva de Infraestructura ✅

Referencia: [Catalogo de Infraestructura SRS - Marzo 2026](https://www.notion.so/3217981f08ef81828e31edfcc9b78414) — Sección 4 (Convención de Puertos) y Sección 5 (Onboarding)

- [x] Abrir el Catálogo de Infraestructura SRS → consultado el 11 may.
- [x] Revisar el Manifiesto SDD-SRS → stack Next.js 16 + Postgres + Drizzle es desviación del stack estándar (MongoDB), justificada por ADR-1 (PostGIS necesario por naturaleza geoespacial). Coherente con OpsManager (ADR-007 análogo).
- [x] Identificar el siguiente offset de puertos libre → era +170 tras ARGOS (+160 reservado 9 may).
- [x] Asignar puertos: frontend (3xxx), API (4xxx), servicios internos (5xxx), bases de datos (6xxx) → frontend `3170`, API `4170` (route handlers Next), internal `5170` reservado, Postgres `6170`, Redis `6171`.
- [x] Reservar dominio: `agroops.agrom.es` (propuesta, pendiente DNS Hostinger).
- [x] Actualizar la tabla de puertos en el Catálogo de Infra (marcar offset como ocupado) → aplicado el 11 may.
- [x] Actualizar "Siguiente offset libre" en el Catálogo → ahora "+180".

---

# FASE 4 — Desarrollo Local 🟡 (Sprint 0 cerrado, Sprint 1 abierto)

- [x] Crear repositorio GitHub con estructura definida en SDD-06 → `github.com/gutierrezbj/AgroOPs` (creado vacío upstream, clonado el 11 may).
- [x] Crear `CLAUDE.md` en la raíz del repo → del bundle `agroops-bootstrap`. Cubre stack, ADRs, reglas, convenciones, estructura, backlog activo, despliegue, Identity Sprint, lecciones.
- [x] Crear docker-compose.yml con puertos asignados (SIEMPRE 127.0.0.1:PUERTO:INTERNO) → el bundle violaba la convención (exponía 5432/6379 en 0.0.0.0). Resuelto con `docker-compose.override.yml` aplicando offset +170 + bind 127.0.0.1 vía sintaxis `!override`. **Ver Discrepancias del bundle Sprint 0 para el TODO upstream.**
- [x] Scaffold del proyecto según stack aprobado → `pnpm create next-app@latest agroops --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack --yes` en tmp dir lowercase (npm rechaza mayúsculas en nombre), luego rsync al repo preservando `.git` del clone.
- [x] Desarrollo en Mac Mini (bleu) — primer entorno siempre → confirmado.
- [ ] Tests según plan SDD-07 (coverage mínimo cumplido) → **pendiente** — Vitest y Playwright instalados, falta primer test. **Bloqueante de Fase 5.**
- [x] Verificar que el proyecto arranca limpio desde cero → `docker compose ps` ambos healthy, `pnpm tsc --noEmit` limpio, seed AgroM cargado (3 users / 3 drones / 1 pilot / 1 client demo).

---

# FASE 5 — Deploy en Staging ⛔ N/A

> AgroOps sigue el flujo `Mac → PROD directo` (Interno/crítico, igual que SA99 y Vigía, justificado por single-tenant per deployment + sin staging declarado en CLAUDE.md / SDD-08). **Esta fase se salta por decisión arquitectónica documentada.**

---

# FASE 6 — Deploy en Producción ⛔ Pendiente

Para cuando llegue:

- [ ] SSH a PROD (`100.71.174.77`)
- [ ] Clonar repo en `/opt/apps/agroops/`
- [ ] `docker compose up -d --build`
- [ ] Verificar containers UP
- [ ] Configurar Nginx reverse proxy (vhost con `/` → `:3170`, `/api/` → `:4170` si se desacopla)
- [ ] Activar SSL con Certbot (`certbot --nginx -d agroops.agrom.es`)
- [ ] Configurar DNS en Hostinger (registro A `agroops.agrom.es` → `72.62.41.234`)
- [ ] Registrar containers en `healthcheck.sh` (`agroops-frontend`, `agroops-postgres`, `agroops-redis`)
- [ ] Registrar proyecto en SA99 InfraService (servidor `vps-prod`, `db.servers.updateOne({_id: "vps-prod"}, {$set: {"projects.AgroOps": {containers: [...], domain: "agroops.agrom.es"}}})`)
- [ ] Agregar PostgreSQL a backup script (no `backup-mongo.sh`; necesita `backup-postgres.sh` o equivalente — coordinar con SA99/infra).
- [ ] Verificación final: cero puertos `0.0.0.0`, dominio responde HTTPS, containers UP.

> **Pre-requisito de Fase 6:** Identity Sprint cerrado + Distinctiveness Audit aprobado (los 12 puntos del Design System).

---

# FASE 7 — Documentar y Cerrar Kickoff ⛔ Pendiente

- [x] Actualizar Catálogo de Infra — Sección 4 (tabla de asignación de puertos) → aplicado 11 may.
- [x] Actualizar "Siguiente offset libre" → ahora +180.
- [ ] Actualizar Catálogo de Infra — Sección 2 (tabla de proyectos PROD/STAGING) → pendiente al deploy.
- [ ] Actualizar Catálogo de Infra — Sección 7 (tabla de dominios y DNS) → pendiente al deploy.
- [ ] Actualizar tabla de proyectos en el Manifiesto SDD-SRS → fila AgroOps lista en staging, aplicación pendiente de confirmación del usuario.
- [ ] Verificar que el healthcheck reporta TODOS los containers del proyecto como UP → pendiente al deploy.
- [ ] Verificar que SA99 dashboard muestra el proyecto con nombre y dominio correctos → pendiente al deploy.
- [ ] Completar contenido mínimo de subcarpetas (Documentación, Diseño, Desarrollo, Recursos) → en curso.
- [ ] Marcar proyecto como "Fase 1 en curso" en la tabla del Manifiesto → cuando Sprint 1 arranque oficialmente.

---

## Responsable

JuanCho (dir. técnico/dev/piloto). Asistencia: agentes IA bajo supervisión.

## Historial de cambios del checklist

- **v0.1 (11 may 2026):** duplicado de plantilla SRS, marcado retroactivo de Fases 0–4 completadas durante Sprint 0 del 11 may. Fases 5–7 quedan pendientes.
