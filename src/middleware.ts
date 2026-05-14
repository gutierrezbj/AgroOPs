/**
 * AgroOps — Next.js middleware
 *
 * Protege todas las rutas excepto `/login`, las API routes de Auth.js y los
 * assets estáticos. Si no hay sesión y la ruta es protegida, redirige a /login.
 * Si hay sesión y la ruta es /login, redirige a /dashboard.
 *
 * Edge runtime — sólo usa `authConfig` (sin Credentials/bcrypt/pg).
 */
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: [
    /*
     * Match todo excepto:
     * - api/auth (Auth.js handlers)
     * - api/health (healthcheck público — Docker HEALTHCHECK + Uptime Robot
     *   externo; debe responder 200/503 sin auth. CLAUDE.md HU-25.)
     * - _next/static (Next assets)
     * - _next/image (Next image optimizer)
     * - favicon.ico
     * - cualquier archivo con extensión (assets públicos)
     */
    "/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
