# SDD-04 — Decisiones Técnicas (ADRs)

Resumen de los 10 ADRs vigentes. Todos cerrados antes del Sprint 0. Versión vivente en el repo (`CLAUDE.md`) y aquí (espejo Notion).

---

## ADR-1 — PostgreSQL 16 + PostGIS + Drizzle ORM (no MongoDB)

**Estado:** Decidido.

**Contexto:** el resto del stack SRS estándar es MongoDB (Manifiesto SDD-SRS). AgroOps maneja parcelas SIGPAC con geometrías Polygon y queries espaciales (intersecciones, distancias, buffers, áreas reales).

**Decisión:** PostgreSQL 16 + PostGIS 3.4 + Drizzle ORM, desviándose del stack estándar.

**Consecuencias:**
- Stack diferente al resto del parque SRS → requiere su propio container y backup.
- Queries espaciales nativas, índices GIST sobre `parcels.geometry`.
- Drizzle aporta type-safety estricto + migraciones reversibles.
- Coherente con OpsManager (que también usa Postgres+PostGIS+Drizzle, ADR-007 análogo).

**Alternativas descartadas:** MongoDB + GeoJSON nativo (queries más débiles, sin GIST), Prisma (más rígido), TypeORM (menos type-safe).

---

## ADR-2 — Single-tenant per deployment

**Estado:** Decidido.

**Contexto:** AgroM es el primer operador, pero el modelo de negocio admite réplicas (Fitolink_LATAM, otros operadores potenciales). ¿Multi-tenant SaaS o clone-and-deploy?

**Decisión:** Single-tenant per deployment. Sin `tenant_id` en ninguna tabla, sin RLS, sin gestión de tenants en UI. Si aparece segundo operador → fork del repo + deploy independiente.

**Consecuencias:**
- Schema 30-40% más limpio (sin tenant_id por todas partes).
- Sin riesgo de data leak entre tenants.
- Sin gestión de superadmin cross-tenant.
- Coste mayor por operador (un VPS por operador) pero precio premium justificado por trazabilidad.

**Alternativas descartadas:** Multi-tenant con RLS (complejidad alta v1 sin upside claro), multi-tenant lógico (riesgo data leak).

---

## ADR-3 — Integración FitoLink vía API limpia (no shared DB)

**Estado:** Decidido.

**Contexto:** AgroOps y FitoLink son productos hermanos del vertical agro. Tentación: BD compartida para no duplicar parcelas/clientes.

**Decisión:** API pública FitoLink v1.2 como interfaz. Cero shared DB.

**Consecuencias:**
- Separación clara de productos, deploy independiente.
- Cada producto evoluciona su schema sin romper al otro.
- Coste: duplicar entidades (parcelas, clientes) entre AgroOps y FitoLink, sync vía API.

**Alternativas descartadas:** BD compartida (acoplamiento fuerte, deploy coordinado obligatorio), microservicio común (sobreingeniería para v1).

---

## ADR-4 — El producto fitosanitario lo aporta el cliente final

**Estado:** Decidido.

**Contexto:** ¿AgroOps gestiona stock de fitosanitarios?

**Decisión:** No. El cliente final aporta el producto. AgroOps **registra el lote usado** (`mission_phyto.lotUsed`) pero **no inventaría** ni descuenta stock.

**Consecuencias:**
- Schema simplificado (sin tabla de stock movements).
- Menos responsabilidad legal (almacenamiento de fitosanitarios requiere licencia).
- Coste: AgroM no puede ofrecer "servicio integral con producto incluido" en v1.

**Alternativas descartadas:** Gestión completa de stock (licencias + warehouse), modelo intermedio (parcial: complica sin upside).

---

## ADR-5 — Operación bajo paraguas Drovinci (NPTA AESA)

**Estado:** Decidido. Revisable cuando AgroM tenga SORA propia.

**Contexto:** Para operar legalmente con T50 en aplicación fitosanitaria se necesita NPTA (No Para Tareas Aéreas, autorización AESA). AgroM no la tiene aún (Q3 2026). Drovinci sí.

**Decisión:** Hasta SORA propia AgroM, toda misión va bajo `nptaReference = "NPTA-DROVINCI-2026"`. Hardcoded en `src/lib/constants.ts`.

**Consecuencias:**
- Reparto comercial 70/30 con Drovinci sobre cada operación.
- Cliente firma con AgroM, AgroM factura, pero el seguro AESA va por Drovinci.
- Cuando AgroM tenga SORA → cambiar la constante + ADR-5 a "Revertido".

**Alternativas descartadas:** Esperar SORA propia antes de operar (bloquea 2026 entero), operar sin paraguas (ilegal).

---

## ADR-6 — Facturación delegada a Holded (source of truth fiscal)

**Estado:** Decidido.

**Contexto:** ¿AgroOps emite facturas o las delega?

**Decisión:** Holded API. AgroOps guarda en `invoices_ref` solamente: holdedInvoiceId, número, URL, monto, status, errores. Holded es source of truth fiscal.

**Consecuencias:**
- Sin cálculo de IVA en AgroOps, sin manejo de retenciones, sin numeración fiscal propia.
- Si Holded cae, no se puede facturar (pero sí registrar misión y albarán).
- Coste: Holded ~30€/mes por operador.

**Alternativas descartadas:** FacturaScripts self-hosted (mantenimiento), facturación propia (compliance pesado), Stripe (no IVA agro español).

---

## ADR-7 — Auth.js v5 + credentials + bcrypt + Redis (sin multi-tenant adapter)

**Estado:** Decidido.

**Contexto:** ¿Auth.js v4 estable o v5 beta? ¿Credentials o OAuth?

**Decisión:** Auth.js v5 beta + Credentials provider + bcryptjs + sesiones en Redis. Sin adapter multi-tenant.

**Consecuencias:**
- API moderna (`useActionState`-friendly, Server Actions nativas).
- Beta status asumido como riesgo controlado (ya en uso en otros proyectos SRS).
- Sin OAuth en v1 (login interno operador, no usuarios externos).

**Alternativas descartadas:** Auth.js v4 (deprecating), Clerk (vendor lock, coste), custom JWT (reinventar rueda).

---

## ADR-8 — API pública versionada por path `/api/v1/...`

**Estado:** Decidido. API v1.2 cuando se publique.

**Contexto:** FitoLink y futuros consumidores necesitan API.

**Decisión:** Versionado por path. v1.0 interna (Server Actions), v1.2 cuando se exponga al exterior (FitoLink consumirá esta).

**Consecuencias:**
- Versionado limpio, breaking changes en path nuevo.
- Cliente puede elegir versión.

**Alternativas descartadas:** Versionado por header (menos discoverable), sin versionar (suicidio futuro).

---

## ADR-9 — Backups encriptados off-site, restore probado mensual

**Estado:** Decidido.

**Contexto:** Datos de operación con responsabilidad legal (cuaderno PAC, facturas).

**Decisión:** Dump diario de Postgres + GPG + sync a S3-compatible (Backblaze B2 o Hetzner Storage Box). Restore probado mensual (ver SDD-08).

**Consecuencias:**
- Cumple GDPR + tax law española.
- Sin restore probado mensual, el backup es ficción → disciplina obligatoria.

**Alternativas descartadas:** Sólo snapshot del VPS (no granular), backup sin encriptar (GDPR risk).

---

## ADR-10 — Naming: AgroOps producto, AgroM operador

**Estado:** Decidido.

**Contexto:** El producto a menudo se confunde con su primer cliente. Riesgo de "ser SAP del operador X".

**Decisión:** Comunicar siempre AgroOps como producto independiente, AgroM como su primer deployment. UI dice "AgroOps", facturación dice "AgroM", contratos dicen ambos según corresponde.

**Consecuencias:**
- Permite vender a segundo operador sin renaming.
- Marca producto independiente (AgroOps) bajo dominio operativo de la matriz: `agroops.agrom.es`. Coherente con ecosistema FitoLink → AgroM → AgroOps. [Actualizado 14-may-2026: rectificación tras intento previo en `agroops.systemrapid.io` v0.2.]

**Alternativas descartadas:** Llamar al producto "AgroM Suite" (lock-in al primer cliente).

---

## Historial de ADRs

- **11 may 2026:** ADR-1 a ADR-10 cerrados en Sprint 0 (vienen del bundle, validados retroactivamente al pasar por Cuaderno Base de Proyectos).
