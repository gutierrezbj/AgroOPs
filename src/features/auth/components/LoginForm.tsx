"use client";

/**
 * AgroOps — LoginForm
 *
 * Formulario funcional mínimo de login. Sin styling productivo (Identity
 * Sprint bloquea UI productiva, ver CLAUDE.md). Sólo cumple HU-02:
 * - Inputs email + password con validación HTML5 + Zod server-side.
 * - useActionState para feedback de error sin client-side JS innecesario.
 * - Mensajes de error en español, accesibles con role="alert".
 */
import { useActionState } from "react";
import { loginAction, initialLoginState } from "../actions/login";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialLoginState,
  );

  return (
    <form action={formAction} className="auth-form" noValidate>
      <fieldset disabled={pending}>
        <legend>Iniciar sesión</legend>

        <label htmlFor="login-email">
          Email
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={state.fieldErrors?.email ? "true" : "false"}
            aria-describedby={
              state.fieldErrors?.email ? "login-email-error" : undefined
            }
          />
        </label>
        {state.fieldErrors?.email && (
          <p id="login-email-error" role="alert" className="auth-form__error">
            {state.fieldErrors.email}
          </p>
        )}

        <label htmlFor="login-password">
          Contraseña
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={state.fieldErrors?.password ? "true" : "false"}
            aria-describedby={
              state.fieldErrors?.password ? "login-password-error" : undefined
            }
          />
        </label>
        {state.fieldErrors?.password && (
          <p
            id="login-password-error"
            role="alert"
            className="auth-form__error"
          >
            {state.fieldErrors.password}
          </p>
        )}

        <button type="submit" className="auth-form__submit">
          {pending ? "Entrando…" : "Entrar"}
        </button>

        {state.error && !state.fieldErrors && (
          <p role="alert" className="auth-form__error">
            {state.error}
          </p>
        )}
      </fieldset>
    </form>
  );
}
