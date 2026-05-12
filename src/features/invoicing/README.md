# features/invoicing

**Épica EP-07 — Facturación Holded.**

Dispara factura a Holded al cerrar albarán. Sincroniza estado (pagada / cancelada).
**Holded es la fuente de verdad fiscal** (ADR-6).

## Historias asignadas

- HU-18 Conexión API key con Holded.
- HU-19 Disparo automático de factura al cerrar albarán.
- HU-20 Sincronización estado factura → misión.

## Schemas relacionados

- `src/db/schema/invoices-ref.ts`.

## Estructura esperada

```
invoicing/
  components/       # InvoiceStatusBadge, HoldedLink
  actions/          # dispatchInvoice (servidor → Holded), syncInvoiceStatus
  services.ts       # mapeo Mission → HoldedInvoicePayload
```

## Dependencias

- `src/server/integrations/holded.ts`
