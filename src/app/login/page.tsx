/**
 * AgroOps — /login
 *
 * Identity v0.2 (FitoLink → AgroM → AgroOps): logo wordmark SVG en
 * Instrument Serif con 'Ops' italic + punto terra-500 sobre la primera
 * 'O', tagline corporativo, footer con paraguas Drovinci. Tokens de
 * paleta y tipografía consumidos vía `src/app/globals.css`.
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
