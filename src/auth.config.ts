/**
 * AgroOps — Auth.js v5 config edge-compatible
 *
 * Esta config NO importa providers que usan APIs Node (bcrypt, pg). Se usa
 * en el middleware (edge runtime) para chequear sesión sin abrir conexiones
 * a DB ni cargar bcrypt. El `auth.ts` completo extiende esta config con el
 * provider `Credentials`.
 *
 * Documentación: https://authjs.dev/guides/edge-compatibility
 *
 * Los callbacks usan type assertions sobre `token` para inyectar campos
 * custom (`userId`, `role`); el module augmentation en `types/next-auth.d.ts`
 * extiende los tipos pero TS strict requiere asserción explícita aquí.
 */
import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/db/schema/users";

export const authConfig: NextAuthConfig = {
  providers: [], // se rellena en auth.ts con Credentials
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as { role: UserRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.role = token.role as UserRole;
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const path = request.nextUrl.pathname;
      const isOnLogin = path === "/login";

      if (isOnLogin) {
        // Si ya hay sesión, redirige a /dashboard.
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      // Resto de rutas requieren sesión.
      return isLoggedIn;
    },
  },
  trustHost: true,
};
