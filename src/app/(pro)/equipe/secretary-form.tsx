"use client";

import { useActionState } from "react";
import { createSecretaryAction } from "./actions";

export function SecretaryForm({ practitioners }: { practitioners: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createSecretaryAction, undefined);

  return (
    <form action={formAction} className="card flex flex-col gap-3 p-4">
      <p className="font-medium text-slate-900">Ajouter une secrétaire / un télé-secrétariat</p>
      <div className="grid grid-cols-2 gap-3">
        <input name="firstName" placeholder="Prénom" required className="rounded-lg border border-border px-3 py-2 text-sm" />
        <input name="lastName" placeholder="Nom" required className="rounded-lg border border-border px-3 py-2 text-sm" />
      </div>
      <input type="email" name="email" placeholder="Email" required className="rounded-lg border border-border px-3 py-2 text-sm" />
      <div>
        <p className="text-xs font-medium text-slate-600">Praticiens à gérer</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {practitioners.map((p) => (
            <label key={p.id} className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-sm">
              <input type="checkbox" name="practitionerIds" value={p.id} />
              {p.name}
            </label>
          ))}
          {practitioners.length === 0 && <p className="text-sm text-slate-500">Ajoutez d&apos;abord un praticien.</p>}
        </div>
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && (
        <p className="rounded-lg bg-success/10 p-3 text-sm text-success">
          Compte créé pour {state.email}. Mot de passe temporaire (à communiquer et changer) :{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900">{state.tempPassword}</code>
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Création..." : "Créer le compte secrétariat"}
      </button>
    </form>
  );
}
