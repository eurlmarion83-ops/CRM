"use client";

import { useTransition } from "react";
import { moveProspectStatutAction } from "./actions";

export function ProspectCard({
  prospect,
}: {
  prospect: { id: string; nom: string; contactEmail: string | null; contactPhone: string | null; statut: string; notes: string | null };
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card flex flex-col gap-1 p-3 text-sm">
      <p className="font-medium text-slate-900">{prospect.nom}</p>
      {(prospect.contactEmail || prospect.contactPhone) && (
        <p className="text-xs text-slate-500">
          {prospect.contactEmail}
          {prospect.contactEmail && prospect.contactPhone ? " · " : ""}
          {prospect.contactPhone}
        </p>
      )}
      {prospect.notes && <p className="text-slate-600">{prospect.notes}</p>}
      <div className="mt-2 flex gap-1">
        <button
          disabled={isPending || prospect.statut === "NOUVEAU"}
          onClick={() => startTransition(() => moveProspectStatutAction(prospect.id, -1))}
          className="rounded-full border border-border px-2 py-1 text-xs hover:bg-brand-light disabled:opacity-40"
        >
          ←
        </button>
        <button
          disabled={isPending || prospect.statut === "PERDU"}
          onClick={() => startTransition(() => moveProspectStatutAction(prospect.id, 1))}
          className="rounded-full border border-border px-2 py-1 text-xs hover:bg-brand-light disabled:opacity-40"
        >
          →
        </button>
      </div>
    </div>
  );
}
