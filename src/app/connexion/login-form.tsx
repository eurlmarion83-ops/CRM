"use client";

import { useActionState, useState } from "react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const [requires2fa, setRequires2fa] = useState(false);

  async function checkTwoFactor(email: string) {
    if (!email) return;
    const res = await fetch(`/api/auth/requires-2fa?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    setRequires2fa(Boolean(data.required));
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          onBlur={(e) => checkTwoFactor(e.target.value)}
          className="rounded-lg border border-border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Mot de passe
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="rounded-lg border border-border px-3 py-2"
        />
      </label>
      {requires2fa && (
        <label className="flex flex-col gap-1 text-sm">
          Code de vérification (application d&apos;authentification)
          <input
            type="text"
            name="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            className="rounded-lg border border-border px-3 py-2"
          />
        </label>
      )}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
