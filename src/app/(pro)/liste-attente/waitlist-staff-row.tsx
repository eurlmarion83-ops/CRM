"use client";

import { useTransition } from "react";
import { notifyWaitlistEntryNowAction, withdrawWaitlistStaffAction } from "./actions";

export function WaitlistStaffRow({
  entry,
}: {
  entry: {
    id: string;
    patientName: string;
    patientContact: string;
    practitionerName: string;
    motifName: string;
    statut: string;
    preferredFrom: string | null;
    preferredTo: string | null;
    createdAt: string;
  };
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card flex items-start justify-between gap-4 p-4">
      <div>
        <p className="font-medium text-slate-900">
          {entry.patientName}{" "}
          {entry.statut === "NOTIFIE" && (
            <span className="ml-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Notifié(e)</span>
          )}
        </p>
        <p className="text-sm text-slate-600">
          {entry.motifName} — {entry.practitionerName}
        </p>
        <p className="text-xs text-slate-500">
          Contact : {entry.patientContact || "non renseigné"} · Inscrit(e) le {entry.createdAt}
          {(entry.preferredFrom || entry.preferredTo) && (
            <>
              {" "}
              · Souhaite entre {entry.preferredFrom ?? "..."} et {entry.preferredTo ?? "..."}
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          disabled={isPending}
          onClick={() => startTransition(() => notifyWaitlistEntryNowAction(entry.id))}
          className="rounded-full border border-brand px-3 py-1 text-xs font-medium text-brand-dark hover:bg-brand-light disabled:opacity-40"
        >
          Notifier maintenant
        </button>
        <button
          disabled={isPending}
          onClick={() => startTransition(() => withdrawWaitlistStaffAction(entry.id))}
          className="rounded-full border border-border px-3 py-1 text-xs hover:bg-slate-100 disabled:opacity-40"
        >
          Retirer
        </button>
      </div>
    </div>
  );
}
