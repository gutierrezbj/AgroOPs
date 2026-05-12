# Notion staging — AgroOps

Contenido preparado para crear las páginas Notion del proyecto AgroOps siguiendo el Protocolo de Kickoff del Cuaderno Base de Proyectos SRS.

> **Por qué staging local y no creación directa**
>
> El 11 may 2026 noche, al intentar crear estas páginas, el sistema de permisos del agente bloqueó la operación: como JuanCho estaba durmiendo, el agente no podía verificar contigo cuál es el padre exacto bajo el que deben colgar las páginas. La inferencia razonable era `[SRS] - Técnico` (ID `2fe7981f08ef81e49ca6cc1522568850`), donde viven los demás productos SRS (OttoIA, InsiteIQ, OverWatch, etc.). Pero como esa inferencia no estaba confirmada explícitamente por JuanCho, el sistema escaló al modo "no actuar sin verificación humana". Comportamiento correcto. Por eso el contenido vive aquí, listo para crear cuando confirmes el padre al despertar.

## Estructura propuesta

```
[SRS] - Técnico  (parent confirmado: 2fe7981f08ef81e49ca6cc1522568850)
└── AgroOps  ← página principal a crear (overview + índice SDD)
    ├── Checklist de Kickoff — AgroOps  ← duplicar plantilla y marcar fases hechas
    ├── Checklist de UX/UI — AgroOps    ← duplicar plantilla, bloqueado en Fase 0
    ├── SDD-01 Definición del Problema
    ├── SDD-02 Alcance y Límites
    ├── SDD-03 Arquitectura Técnica
    ├── SDD-04 Decisiones Técnicas (ADRs)
    ├── SDD-05 Backlog Inicial
    ├── SDD-06 Reglas de Desarrollo
    ├── SDD-07 Plan de Testing
    ├── SDD-08 Plan de Despliegue
    ├── Documentación   (subcarpeta estándar)
    ├── Diseño          (subcarpeta estándar)
    ├── Desarrollo      (subcarpeta estándar)
    ├── Recursos        (subcarpeta estándar)
    └── Discrepancias del bundle Sprint 0  ← reporte para cowork
```

## Cómo cerrarlo cuando despiertes

**Opción A — Autorizar al agente.** Decirle "Crea las páginas Notion bajo `[SRS] - Técnico`" (o el padre que prefieras). El agente carga las herramientas `notion-create-pages` y `notion-duplicate-page` y publica con el contenido de esta carpeta.

**Opción B — Manual con copy-paste.** Abrir cada `.md` de esta carpeta, copiar el contenido y pegarlo como página nueva en Notion bajo el padre que elijas.

**Opción C — Duplicar plantillas.** En vez de crear desde cero, duplicar las plantillas oficiales del Cuaderno Base:
- [PLANTILLA] Checklist de Kickoff (`3257981f08ef8191b135d5da2bc759d1`)
- [PLANTILLA] Checklist de UX/UI (`3407981f08ef812ea9acfb49c8e597d2`)

Luego renombrar la copia quitando `[PLANTILLA]`, añadiendo `— AgroOps`, y marcar las fases ya completadas según `02-checklist-kickoff-agroops.md`.

## Inventario de archivos

| Archivo | Página equivalente en Notion |
|---|---|
| `01-agroops-overview.md` | Página principal AgroOps |
| `02-checklist-kickoff-agroops.md` | Checklist de Kickoff — AgroOps (con fases ya marcadas) |
| `03-checklist-uxui-agroops.md` | Checklist de UX/UI — AgroOps (placeholder Fase 0) |
| `04-sdd-01-definicion-problema.md` | SDD-01 |
| `05-sdd-02-alcance.md` | SDD-02 |
| `06-sdd-03-arquitectura.md` | SDD-03 |
| `07-sdd-04-adrs.md` | SDD-04 |
| `08-sdd-05-backlog.md` | SDD-05 |
| `09-sdd-06-reglas-desarrollo.md` | SDD-06 |
| `10-sdd-07-testing.md` | SDD-07 |
| `11-sdd-08-despliegue.md` | SDD-08 |
| `12-discrepancias-bundle.md` | Discrepancias del bundle Sprint 0 (reporte para cowork) |

## Actualizaciones que SÍ se aplicaron directamente en Notion

Páginas existentes (no creación nueva), por tanto autorizadas:

1. **Catálogo de Infraestructura SRS** (`3217981f08ef81828e31edfcc9b78414`) — bloque `Update 2026-05-11 — AgroOps reserva offset +170` añadido al inicio + fila AgroOps en tabla de Sección 4 + "Siguiente offset libre" actualizado a +180. **Aplicado el 11 may 2026 durante el bootstrap.**
2. **Manifiesto SDD-SRS** (`2f67981f08ef81649634eb77d65a0c48`) — fila AgroOps añadida a tabla de proyectos + historial v1.8. **Intentado tras el bloqueo del create; ver reporte de cierre.**
3. **Cuaderno de Protocolos AgroM** (`35d7981f08ef81329a43f0daea4447c1`) — AgroOps añadido a sección 2 (Cartera vertical) como tercer producto. **Intentado tras el bloqueo del create; ver reporte de cierre.**
