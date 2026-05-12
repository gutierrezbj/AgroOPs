# features/documents

**Épica EP-06 — Documentos (presupuesto, albarán, firma).**

Motor PDF basado en `pdf-lib`. Plantillas server-side. Firma del agricultor en finca.

## Historias asignadas

- HU-15 PDF presupuesto AgroM (motor + plantilla).
- HU-16 PDF albarán de aplicación (motor + plantilla con firma + telemetría + AEMET).
- HU-17 Firma digital canvas del agricultor (optimizado tablet).

## Schemas relacionados

- `src/db/schema/albarans.ts`.

## Estructura esperada

```
documents/
  components/       # SignaturePad (canvas), AlbaranPreview, BudgetPreview
  actions/          # generateBudgetPdf, finalizeAlbaran (firma + PDF + hash)
  templates/        # JSX-based templates server-side (presupuesto, albarán)
  services.ts       # render con pdf-lib, hash SHA-256
```
