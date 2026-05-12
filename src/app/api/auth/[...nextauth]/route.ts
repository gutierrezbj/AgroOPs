/**
 * AgroOps — Auth.js route handlers
 *
 * Catch-all que delega en los handlers exportados por `@/auth`. Endpoints
 * estándar de Auth.js v5 montados bajo `/api/auth/*` (signin, signout,
 * session, csrf, callback, etc).
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
