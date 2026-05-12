/**
 * AgroOps — /login
 *
 * Identity Sprint v1 aplicado: logo wordmark SVG (Fraunces 500/900 con punto terra
 * sobre la primera 'O' de Ops), tagline corporativo, footer con paraguas Drovinci.
 * Tokens de paleta / tipografía consumidos vía `src/app/globals.css`.
 */
import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <main className="login-page">
      <header className="login-page__header">
        <Image
          src="/agroops-logo.svg"
          alt="AgroOps"
          width={360}
          height={100}
          priority
          className="login-page__logo"
        />
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
