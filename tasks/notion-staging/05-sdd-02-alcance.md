# SDD-02 — Alcance y Límites

## In-scope v1.0 (épicas EP-01 a EP-09)

- **EP-01 Bootstrap single-tenant** — Auth.js v5 + RBAC 4 roles, audit log base, layout productivo (Sprint 0 + Sprint 1).
- **EP-02 Fleet management** — ABM drones (T50, Mavic 3E, D-RTK 2), ABM pilotos con licencias AESA + ROPO + seguro, asignación piloto-dron por misión.
- **EP-03 Parcelas y catálogo** — ABM clientes, ABM parcelas con geometría SIGPAC (PostGIS Polygon SRID 4326), ABM catálogo fitosanitario (lote, dosis, plazo seguridad, MAPA registration).
- **EP-04 Mission state machine** — wizard de creación de misión, máquina de estados 8 fases (`draft → planned → approved → preflight → in_flight → completed → invoiced` + `cancelled` desde cualquier estado), generador código `AGM-YYYY-NNNN`, gates de transición.
- **EP-05 Mapa y meteo** — visualización MapLibre GL + tiles CARTO, overlay de parcelas, captura snapshot meteo AEMET en preflight, overlay NOTAMs ENAIRE.
- **EP-06 Documentos** — PDF de albarán firmado (firma capturada en canvas + hash SHA-256), templates con pdf-lib, almacenamiento local + path.
- **EP-07 Facturación Holded** — creación de factura post-misión, sync de estado (issued / paid / cancelled / error), reference store en `invoices_ref` (Holded es source of truth fiscal, AgroOps sólo guarda referencia + estado).
- **EP-08 Cuaderno de campo + cumplimiento PAC** — vista agregada del audit trail (misión → parcela → fito → albarán → factura), export PAC formato administración.
- **EP-09 Audit + observabilidad** — `audit_log` append-only para mutaciones críticas, healthcheck Telegram, registro SA99.

**Cronograma:** Sprint 0 (cerrado) + 5 sprints v1.0 = 9 semanas (SDD-08).

## Out-of-scope v1.0 (explícito)

- **Multi-tenant SaaS.** ADR-2: single-tenant per deployment. Si aparece segundo operador → clone-and-deploy. Sin `tenant_id`, sin RLS, sin gestión de tenants en UI.
- **Gestión de stock de fitosanitario.** ADR-4: el producto lo aporta el cliente final. AgroOps registra el lote usado, no gestiona inventario.
- **Facturación interna.** Holded es fuente de verdad fiscal (ADR-6). AgroOps no calcula IVA, no emite facturas internas.
- **Operación bajo SORA propia AgroM.** ADR-5: hasta que AgroM tenga SORA, todo va bajo paraguas Drovinci NPTA. El campo `nptaReference` se hardcodea a `NPTA-DROVINCI-2026` por ahora.
- **Modelo SaaS para terceros operadores.** Si llega oportunidad → clone-and-deploy con repo separado.
- **Integración FitoLink en este v1.** ADR-3: vía API limpia (v1.2) cuando esté lista, no shared DB.
- **App móvil nativa.** Web responsive sirve (tablet/móvil del piloto en finca). Nativa queda fuera.
- **Pilotos externos / marketplace.** Lo cubre FitoLink; AgroOps gestiona la flota propia del operador.
- **Reporting BI / dashboards analíticos avanzados.** En v1 sólo lo necesario para auditoría operativa.

## Límites técnicos asumidos

- **Geografía v1:** España peninsular (SIGPAC, AEMET, ENAIRE).
- **Idioma v1:** español (i18n queda para v2).
- **Volumen v1:** decenas de misiones/mes (no miles), un operador, decenas de clientes.
- **Disponibilidad:** mejor esfuerzo, sin SLA contractual; backup diario + restore probado mensual.

## Criterios para subir versión mayor (v2+)

Cualquiera de los siguientes obliga a reabrir SDD-01/SDD-02:

- Segundo operador AgroM SL (multi-tenant real, no clone-and-deploy).
- Operación con líquidos (cambia gates de preflight: meteo, deriva, NOTAMs especiales).
- Geografía fuera de España (cambia integraciones SIGPAC/AEMET/ENAIRE por equivalentes regionales).
- AgroOps independizado de FitoLink (cambia ADR-3).
