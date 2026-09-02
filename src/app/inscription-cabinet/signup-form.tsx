"use client";

import { useActionState } from "react";
import { signupCabinetAction } from "./actions";

export function CabinetSignupForm() {
  const [state, formAction, pending] = useActionState(signupCabinetAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-semibold text-slate-900">Votre cabinet</legend>
        <input name="cabinetName" placeholder="Nom du cabinet" required className="rounded-lg border border-border px-3 py-2" />
        <input name="address" placeholder="Adresse" required className="rounded-lg border border-border px-3 py-2" />
        <div className="grid grid-cols-2 gap-3">
          <input name="zip" placeholder="Code postal" className="rounded-lg border border-border px-3 py-2" />
          <input name="city" placeholder="Ville" required className="rounded-lg border border-border px-3 py-2" />
        </div>
        <input name="cabinetPhone" type="tel" placeholder="Téléphone du cabinet" className="rounded-lg border border-border px-3 py-2" />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-semibold text-slate-900">Votre compte administrateur</legend>
        <div className="grid grid-cols-2 gap-3">
          <input name="firstName" placeholder="Prénom" required className="rounded-lg border border-border px-3 py-2" />
          <input name="lastName" placeholder="Nom" required className="rounded-lg border border-border px-3 py-2" />
        </div>
        <input type="email" name="email" placeholder="Email professionnel" required className="rounded-lg border border-border px-3 py-2" />
        <input type="tel" name="phone" placeholder="Téléphone (optionnel)" className="rounded-lg border border-border px-3 py-2" />
        <input type="password" name="password" placeholder="Mot de passe (8 caractères min.)" required minLength={8} className="rounded-lg border border-border px-3 py-2" />
      </fieldset>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Création de votre espace..." : "Créer mon cabinet"}
      </button>
    </form>
  );
}
