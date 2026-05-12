# Auth — HU-02

Login + RBAC + sesión Auth.js v5 sobre los 4 roles de `users.role` (admin / piloto / operario / viewer).

## Diseño

- **Provider:** `Credentials` (sin OAuth en v1, ver ADR-7).
- **Sesión:** JWT firmado con `AUTH_SECRET` (cookies `httpOnly`, `secure` en prod). Redis queda reservado para caching (NOTAMs HU-12, meteo HU-13) y, si se ve necesario en Sprint 2, también para sesiones.
- **RBAC:** server-side via `requireRole(session, [...])` de `@/lib/rbac` (regla 4 del CLAUDE.md).
- **Form:** Server Action + `useActionState`, sin client-side JS innecesario.
- **Hash:** `bcryptjs` con cost 12 (coherente con el seed AgroM).

## Archivos

- `schemas.ts` — Zod `loginSchema`.
- `services.ts` — `verifyCredentials(email, password)` y `updateLastLogin(userId)` contra `db`.
- `actions/login.ts` — Server Action `loginAction` delega a `signIn("credentials", …)`.
- `actions/logout.ts` — Server Action `logoutAction` delega a `signOut(...)`.
- `components/LoginForm.tsx` — formulario funcional mínimo (sin Identity Sprint).

## Integraciones del feature

- `@/auth` — config de NextAuth en raíz `src/auth.ts`, importa `authorize` que llama `verifyCredentials`.
- `@/middleware` — protege todas las rutas excepto `/login` y assets estáticos.
- `@/lib/rbac` — `requireRole`, `hasRole`, `ROLES.*`, `UnauthorizedError`, `ForbiddenError`.

## Smoke test manual

```bash
# Asegúrate que el seed AgroM esté cargado
make psql
# psql>  SELECT email, role FROM users;

pnpm dev
# Abrir http://localhost:3000 → redirect a /login
# Login con juancho@systemrapid.io / agroops-dev-2026 → /dashboard
# Logout → /login
```

## Tests

- `src/lib/rbac.test.ts` — `hasRole`, `requireRole`, `requireAuth`, conjuntos `ROLES`.
- `src/features/auth/schemas.test.ts` — `loginSchema` con casos felices y errores.
- `src/features/auth/services.test.ts` — `verifyCredentials` integration con DB seed.

Cobertura objetivo: 80% (regla SDD-07).
