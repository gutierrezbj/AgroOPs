/**
 * AgroOps — /login
 *
 * Página pública de login. Identity Sprint pendiente: styling productivo
 * llega cuando se cierren los 6 pasos del Design System. Por ahora layout
 * funcional con clases CSS placeholder.
 */
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata = {
  title: "AgroOps — Iniciar sesión",
};

export default function LoginPage() {
  return (
    <main className="login-page">
      <header className="login-page__header">
        <h1>AgroOps</h1>
        <p>Sistema de operaciones UAS para aplicación fitosanitaria.</p>
      </header>
      <Suspense>
        <LoginForm />
      </Suspense>
      <footer className="login-page__footer">
        <small>
          Single-tenant per deployment · Operación bajo paraguas Drovinci NPTA.
        </small>
      </footer>
    </main>
  );
}
