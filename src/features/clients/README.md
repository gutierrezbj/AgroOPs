# features/clients

**Épica EP-03 — Parcelas y catálogo (1/3).**

ABM de clientes del operador AgroM: cooperativas, ATRIA, agricultores profesionales, comunidades de regantes, empresas agrarias.

## Estado

- ✅ **HU-06 ABM clientes** — cerrada 12 may 2026 (typecheck limpio, tests verde).

## Estructura

```
clients/
  README.md                    # este archivo
  schemas.ts                   # Zod + clientTypeLabels
  services.ts                  # CRUD sin archive (FK protege)
  schemas.test.ts / services.test.ts
  actions/
    create-client.ts + .types.ts   # RBAC WRITERS, audit client.created
    update-client.ts + .types.ts   # RBAC WRITERS, audit client.updated
  components/
    ClientsTable.tsx
    ClientForm.tsx
    ClientTypeBadge.tsx
```

Páginas: `src/app/dashboard/clients/{page,new/page,[id]/page}.tsx`.

## Business rules

- `taxId` normalizado: trim + uppercase + quita espacios/puntos/guiones. Validado contra `[A-Z0-9]{8,10}` (CIF/NIF/NIE/passport UE).
- `taxId` UNIQUE (DB + check antes del insert).
- `contactEmail` opcional. Si está, validado con regex básico (no es bloqueante para passports / dominios .gov antiguos).
- `country` ISO 3166-1 alpha-2, default `ES`.
- Si `country === "ES"` y hay `postalCode`, debe ser 5 dígitos.

## Sin archive en v1

Los clientes no se archivan en v1: la FK desde `parcels` y `missions` ya los protege de borrado accidental, y "cliente inactivo" no aporta valor de negocio hasta que tengamos volumen real. Si se necesita en futuro, una migración Drizzle puede añadir `active: boolean`.

## Integración Holded

Campo `holdedContactId` opcional. El operador lo pega manualmente si lo conoce; la sincronización automática (`POST /contacts` a Holded al crear cliente, persist ID retornado) llega en HU-19 (Sprint 3, EP-07 Facturación Holded).
