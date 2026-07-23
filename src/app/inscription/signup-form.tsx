"use client";

import { useActionState } from "react";
import { signupAction } from "./actions";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Prénom
          <input name="firstName" required className="rounded-lg border border-border px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Nom
          <input name="lastName" required className="rounded-lg border border-border px-3 py-2" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input type="email" name="email" required className="rounded-lg border border-border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Téléphone (rappels SMS)
        <input type="tel" name="phone" className="rounded-lg border border-border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Mot de passe (8 caractères min.)
        <input type="password" name="password" required minLength={8} className="rounded-lg border border-border px-3 py-2" />
      </label>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Création..." : "Créer mon compte"}
      </button>
    </form>
  );
}
