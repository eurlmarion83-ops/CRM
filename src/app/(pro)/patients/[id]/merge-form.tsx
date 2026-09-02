"use client";

import { useActionState, useState } from "react";
import { mergePatientsAction } from "./actions";

type PatientHit = { id: string; name: string; phone: string | null; email: string | null };

export function MergeForm({ patientId }: { patientId: string }) {
  const [state, formAction, pending] = useActionState(mergePatientsAction, undefined);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PatientHit[]>([]);
  const [selected, setSelected] = useState<PatientHit | null>(null);
  const [open, setOpen] = useState(false);

  async function search(value: string) {
    setQuery(value);
    setSelected(null);
    if (value.length < 2) {
      setHits([]);
      return;
    }
    const res = await fetch(`/api/patients/search?q=${encodeURIComponent(value)}`);
    const data = await res.json();
    setHits((data.patients ?? []).filter((p: PatientHit) => p.id !== patientId));
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-brand-dark underline">
        Fusionner avec un doublon
      </button>
    );
  }

  return (
    <form action={formAction} className="card mt-2 flex flex-col gap-2 p-4">
      <input type="hidden" name="patientId" value={patientId} />
      {selected && <input type="hidden" name="duplicateId" value={selected.id} />}
      <p className="text-sm font-medium text-slate-900">Fusionner avec un doublon existant</p>
      <p className="text-xs text-slate-500">
        Le patient sélectionné ci-dessous sera supprimé ; ses RDV, documents et conversations seront
        rattachés à la fiche actuelle.
      </p>
      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
          <span>{selected.name}</span>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-brand-dark underline">
            Changer
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Rechercher le patient en doublon..."
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          {hits.length > 0 && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg">
              {hits.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    setSelected(h);
                    setHits([]);
                    setQuery("");
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-light"
                >
                  {h.name} {h.phone ? `— ${h.phone}` : ""}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!selected || pending}
          className="rounded-full bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Fusion..." : "Confirmer la fusion"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-brand-light">
          Annuler
        </button>
      </div>
    </form>
  );
}
