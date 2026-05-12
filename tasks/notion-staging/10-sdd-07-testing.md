# SDD-07 — Plan de Testing

## Frameworks

- **Vitest 4.x** — unit tests + integración. Ya instalado.
- **@vitest/coverage-v8** — métricas de cobertura.
- **Playwright 1.60** — E2E críticos. Ya instalado.

## Cobertura mínima

| Área | Cobertura mínima | Herramienta |
|---|---|---|
| `src/features/<feature>/services.ts` | 80% líneas + 80% branches | Vitest |
| `src/features/<feature>/schemas.ts` | 90% (son schemas puros) | Vitest |
| `src/lib/` | 80% (utilidades puras) | Vitest |
| `src/server/integrations/` | 60% (mock por adapter, no SLA externo) | Vitest |
| `src/db/seed/*` | smoke (correr seed completo en CI) | tsx + pg |
| Flujos críticos E2E | 100% de los happy-path | Playwright |

## Estrategia

### Unit (Vitest)

- **services.ts** — testea lógica de negocio aislada. Mockea Drizzle con `vi.mock` o usa container Postgres de testing.
- **schemas.ts** — testea casos felices, casos límite, mensajes de error de Zod (i18n cuando aplique).
- **lib/mission-codes.ts** — testea generador con casos: año cambio de día, NNNN max overflow, year roll-over.

### Integración (Vitest + DB de testing)

- Conexión a Postgres de testing (container efímero o esquema separado).
- Tests de constraints, FKs, triggers de PostGIS.
- Tests de migraciones reversibles (apply → revert → apply).

### E2E (Playwright)

Flujos críticos que deben cubrir:

1. **Login y RBAC** — admin entra, ve todas las épicas; viewer entra, ve sólo lectura.
2. **Crear cliente + parcela** — operario crea cliente con CIF válido, añade parcela con SIGPAC, ve la parcela en el mapa.
3. **Crear misión completa** — operario crea misión (cliente, parcelas, dron, piloto) → admin aprueba → piloto preflight con AEMET OK → piloto in_flight → piloto completed con firma cliente → factura Holded creada → vista cuaderno de campo refleja la operación.
4. **Albarán PDF** — descargar el PDF generado, verificar hash SHA-256.
5. **Cancelación de misión** — desde planned, desde in_flight, audit log refleja el motivo y estado anterior.

## CI/CD

- **GitHub Actions** sobre cada push a `main` y cada PR.
- **Workflow:**
  1. Lint (`pnpm eslint . --max-warnings 0`).
  2. Typecheck (`pnpm tsc --noEmit`).
  3. Vitest unitarios + cobertura → upload coverage como artefacto.
  4. Spin up Postgres container → run migrations → seed → Vitest integración.
  5. Spin up Next + Postgres + Redis → Playwright críticos.
  6. Si todo verde → deploy automático (ver SDD-08).

## Datos de testing

- **Seed AgroM** del bundle (3 users, 3 drones, 1 piloto, 1 cliente) sirve como dataset base.
- **Fixtures adicionales** en `tests/fixtures/` para escenarios específicos (parcelas con geometrías raras, misiones con telemetría rica, etc.).
- **Sin datos reales de clientes** en tests. Datos sintéticos sólo.

## Regression policy

- Bug en producción → test que reproduzca el bug **antes** del fix.
- El test queda en la suite para evitar regresiones futuras.
- Documentar en `tasks/lessons.md` si el patrón es no obvio.

## Coverage gates (pre-merge)

- 0 errores TS.
- 0 ESLint errors.
- Cobertura services.ts >= 80% (CI rompe el merge si baja).
- E2E críticos verdes.
- Migraciones reversibles (test específico).

---

## Historial

- **v0.1 (11 may 2026):** plan inicial alineado con instalación del Sprint 0. Vitest + Playwright + coverage-v8 instalados, pendientes los primeros tests.
