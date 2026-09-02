"use client";

import { useTransition } from "react";
import { toggleAvisPublieAction } from "./actions";

export function AvisRow({
  avis,
}: {
  avis: { id: string; note: number; commentaire: string | null; publie: boolean; createdAt: string; patientName: string; practitionerName: string };
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className={`card flex items-start justify-between gap-4 p-4 ${!avis.publie ? "opacity-50" : ""}`}>
      <div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-warning">
            {"★".repeat(avis.note)}
            {"☆".repeat(5 - avis.note)}
          </span>
          <span className="text-slate-500">
            {avis.patientName} → {avis.practitionerName} · {avis.createdAt}
          </span>
        </div>
        {avis.commentaire && <p className="mt-1 text-sm text-slate-700">{avis.commentaire}</p>}
      </div>
      <button
        disabled={isPending}
        onClick={() => startTransition(() => toggleAvisPublieAction(avis.id))}
        className="shrink-0 rounded-full border border-border px-3 py-1 text-xs hover:bg-brand-light disabled:opacity-40"
      >
        {avis.publie ? "Masquer" : "Republier"}
      </button>
    </div>
  );
}
