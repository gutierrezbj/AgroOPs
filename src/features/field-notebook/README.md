# features/field-notebook

**Épica EP-08 — Cuaderno de campo + cumplimiento PAC.**

Vista derivada sobre albaranes ejecutados, agregada por fecha y parcela.
En v1 se exporta agregado simple. Cuaderno PAC completo entra en v1.1.

## Historias asignadas

- HU-21 Vista derivada cuaderno de campo agregada.
- HU-22 Export PDF del cuaderno para PAC.

## Estructura esperada

```
field-notebook/
  components/       # FieldNotebookTable, FieldNotebookFilters
  actions/          # exportNotebookPdf
  services.ts       # agregación SQL desde missions + albarans + mission_phyto
  templates/        # plantilla PDF cuaderno
```

## Nota

El formato PAC completo entra en v1.1. En v1 basta con un PDF tabular que
liste fecha + cliente + parcela + cultivo + producto + dosis + área tratada.
