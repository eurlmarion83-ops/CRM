"use client";

import { useActionState, useState } from "react";
import { createAvisAction } from "./actions";

export function AvisForm({ appointmentId }: { appointmentId: string }) {
  const [state, formAction, pending] = useActionState(createAvisAction, undefined);
  const [note, setNote] = useState(5);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="note" value={note} />
      <div className="flex items-center gap-1 text-3xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNote(n)}
            aria-label={`${n} étoile(s)`}
            className={n <= note ? "text-warning" : "text-slate-300"}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        name="commentaire"
        rows={4}
        placeholder="Votre expérience (optionnel)"
        className="rounded-lg border border-border px-3 py-2 text-sm"
      />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Envoi..." : "Publier mon avis"}
      </button>
    </form>
  );
}
