"use client";

import { useActionState } from "react";
import { createDocumentAction } from "./actions";

const TYPES = [
  { value: "ORDONNANCE", label: "Ordonnance" },
  { value: "CERTIFICAT", label: "Certificat médical" },
  { value: "COMPTE_RENDU", label: "Compte rendu de consultation" },
];

export function NewDocumentForm({
  patientId,
  practitioners,
}: {
  patientId: string;
  practitioners: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createDocumentAction, undefined);

  return (
    <form action={formAction} className="card flex flex-col gap-3 p-4">
      <input type="hidden" name="patientId" value={patientId} />
      <p className="font-medium text-slate-900">Nouveau document</p>
      <div className="flex flex-wrap gap-3">
        <select name="practitionerId" className="rounded-lg border border-border px-3 py-2 text-sm" required>
          {practitioners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select name="type" className="rounded-lg border border-border px-3 py-2 text-sm">
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input name="title" placeholder="Titre (optionnel)" className="flex-1 min-w-[160px] rounded-lg border border-border px-3 py-2 text-sm" />
      </div>
      <textarea
        name="content"
        required
        rows={6}
        placeholder="Contenu du document (traitement, observations, texte du certificat...)"
        className="rounded-lg border border-border px-3 py-2 text-sm"
      />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Création..." : "Générer le document"}
      </button>
    </form>
  );
}
