"use client";

import { useTransition } from "react";
import { withdrawWaitlistAction } from "./actions";

export function WaitlistRow({
  entry,
}: {
  entry: { id: string; practitionerName: string; motifName: string; statut: string; createdAt: string };
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-2 text-sm">
      <span>
        {entry.motifName} — {entry.practitionerName}
        {entry.statut === "NOTIFIE" && (
          <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
            Une place s&apos;est libérée !
          </span>
        )}
      </span>
      <span className="flex items-center gap-2 text-slate-500">
        Inscrit(e) le {entry.createdAt}
        <button
          disabled={isPending}
          onClick={() => startTransition(() => withdrawWaitlistAction(entry.id))}
          className="text-brand-dark underline disabled:opacity-40"
        >
          Se désinscrire
        </button>
      </span>
    </div>
  );
}
