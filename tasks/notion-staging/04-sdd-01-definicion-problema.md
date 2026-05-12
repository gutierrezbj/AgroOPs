# SDD-01 — Definición del Problema

## Problema

En España, la aplicación fitosanitaria con dron está creciendo (T50 al 100% legal en LATAM, sólidos/bioestimulantes permitidos en España, regulación PAC obligando cuaderno de campo digital), pero **no existe ningún software vertical que cierre el ciclo punta-a-punta** para un operador AESA legalmente operativo:

- Orden de aplicación (cliente → operador).
- Planificación de la misión (parcela SIGPAC, dron disponible, piloto cualificado ROPO+AESA, NOTAMs activas, meteo favorable).
- Vuelo (telemetría, telemetría de aplicación, área tratada real).
- Albarán firmado en finca (firma del cliente, fitosanitario aplicado, lote, dosis).
- Facturación oficial (Holded, IVA agro, retenciones).
- Registro PAC (cuaderno de campo digital, exportable a la administración).

Cada operador hoy improvisa con Excel, WhatsApp, fotos y un cuaderno físico. Resultado: trazabilidad pobre, riesgo regulatorio, imposibilidad de validar siniestros forense, facturación lenta y errores frecuentes en el cuaderno de campo.

## Para quién

**Operador AESA de aplicación fitosanitaria con dron**, primer deployment: AgroM (Adriana titular autónoma, JuanCho dir. técnico/piloto, John piloto/capital partner T50).

Roles dentro del operador:
- **Admin** (JuanCho): configuración, ABMs, facturación, auditoría.
- **Operario** (Adriana): planificación de misiones, contacto cliente, gestión documental.
- **Piloto** (John): ejecución, captura de telemetría, firma de albarán.
- **Viewer**: stakeholders externos (asesor, contable, auditor PAC).

## Por qué las soluciones existentes no sirven

- **Excel + WhatsApp:** sin audit log, sin firma digital, no exporta cuaderno PAC.
- **VisualNacert / Agrosatélite:** sólo capa satelital (NDVI), no gestionan operación dron ni ciclo facturación.
- **AgroOptima / SAGE Agroges:** ERPs agrarios para el agricultor, no para el operador de servicios dron.
- **Software AESA para operadores (Skypro360 OpsManager, etc.):** gestiona la flota y compliance AESA pero **no la aplicación fitosanitaria** (NPTA Drovinci, dosis, lote, albarán firmado, PAC).
- **DroneHub SRS:** plataforma horizontal del ecosistema drones, no especializada en fitosanitario.

**Diferenciador AgroOps:** integra las 5 capas (satélite via FitoLink + drone inspección + agrónomo opcional + drone aplicación + evidencia forense) en una sola UI, single-tenant per operador.

## Mercado

- **España siniestralidad agraria 2025:** 804M EUR (+15% YoY), 450 peritos para 113.000 siniestros en 1,46M ha, 6.800–7.500M EUR ayudas PAC, cuaderno de campo digital obligatorio.
- **Brasil drones agro:** 77M USD (2024) → 292M USD (2030), CAGR 25,1%, ~50.000 drones operativos 2026 (motor LATAM vía Fitolink_LATAM).
- **TRL FitoLink ~TRL5+** (validación tecnológica, pre-producción).

## Restricciones contextuales

- **Operación bajo paraguas Drovinci (NPTA AESA)** hasta SORA propia AgroM (ADR-5).
- **Sólidos/bioestimulantes** en España (liquidos restringidos con dron); **líquidos** habilitados en LATAM (T50 al 100%).
- **Riesgo concurso SRS SL:** AgroM opera como autónoma Adriana (Fase 1), no constitución SL hasta validación legal con Marcos Álvarez.
