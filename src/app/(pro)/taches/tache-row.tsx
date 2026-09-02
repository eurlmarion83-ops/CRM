"use client";

import { useTransition } from "react";
import { updateTacheStatutAction, deleteTacheAction } from "./actions";

const PRIORITY_COLOR: Record<string, string> = {
  BASSE: "bg-slate-100 text-slate-600",
  NORMALE: "bg-brand-light text-brand-dark",
  HAUTE: "bg-red-100 text-danger",
};

export function TacheRow({
  tache,
}: {
  tache: {
    id: string;
    titre: string;
    description: string | null;
    priorite: string;
    statut: string;
    echeance: Date | null;
    assigneNom?: string | null;
  };
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className={`card flex items-start gap-3 p-3 text-sm ${tache.statut === "FAIT" ? "opacity-50" : ""}`}>
      <select
        value={tache.statut}
        disabled={isPending}
        onChange={(e) => startTransition(() => updateTacheStatutAction(tache.id, e.target.value))}
        className="rounded-lg border border-border px-2 py-1 text-xs"
      >
        <option value="A_FAIRE">À faire</option>
        <option value="EN_COURS">En cours</option>
        <option value="FAIT">Fait</option>
      </select>
      <div className="flex-1">
        <p className="font-medium text-slate-900">{tache.titre}</p>
        {tache.description && <p className="text-slate-600">{tache.description}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className={`rounded-full px-2 py-0.5 ${PRIORITY_COLOR[tache.priorite]}`}>{tache.priorite}</span>
          {tache.echeance && <span>Échéance : {tache.echeance.toLocaleDateString("fr-FR")}</span>}
          {tache.assigneNom && <span>Assigné à {tache.assigneNom}</span>}
        </div>
      </div>
      <button
        disabled={isPending}
        onClick={() => startTransition(() => deleteTacheAction(tache.id))}
        className="text-xs text-slate-400 hover:text-danger"
      >
        Supprimer
      </button>
    </div>
  );
}
