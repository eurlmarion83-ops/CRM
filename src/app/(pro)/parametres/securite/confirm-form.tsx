"use client";

import { useActionState } from "react";
import { confirmTwoFactorAction } from "./actions";

export function ConfirmTwoFactorForm() {
  const [state, formAction, pending] = useActionState(confirmTwoFactorAction, undefined);

  if (state?.success) {
    return <p className="text-sm font-medium text-success">Authentification à deux facteurs activée ✓</p>;
  }

  return (
    <form action={formAction} className="flex items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        Code à 6 chiffres
        <input name="code" inputMode="numeric" maxLength={6} required className="w-32 rounded-lg border border-border px-3 py-2" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Vérification..." : "Activer"}
      </button>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
