"use client";

import { useTransition } from "react";
import { moveDevisStatutAction, transformToFactureAction, sendRelanceAction } from "./actions";

export function KanbanCard({
  devis,
}: {
  devis: { id: string; clientNom: string; objet: string; montant: number; statut: string; dateRelance: Date | null };
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card flex flex-col gap-1 p-3 text-sm">
      <p className="font-medium text-slate-900">{devis.clientNom}</p>
      <p className="text-slate-600">{devis.objet}</p>
      <p className="font-semibold text-brand-dark">{devis.montant.toLocaleString("fr-FR")} €</p>
      {devis.dateRelance && <p className="text-xs text-slate-500">Relancé le {devis.dateRelance.toLocaleDateString("fr-FR")}</p>}
      <div className="mt-2 flex flex-wrap gap-1">
        <button
          disabled={isPending || devis.statut === "BROUILLON"}
          onClick={() => startTransition(() => moveDevisStatutAction(devis.id, -1))}
          className="rounded-full border border-border px-2 py-1 text-xs hover:bg-brand-light disabled:opacity-40"
        >
          ←
        </button>
        <button
          disabled={isPending || devis.statut === "EXPIRE"}
          onClick={() => startTransition(() => moveDevisStatutAction(devis.id, 1))}
          className="rounded-full border border-border px-2 py-1 text-xs hover:bg-brand-light disabled:opacity-40"
        >
          →
        </button>
        <button
          disabled={isPending}
          onClick={() => startTransition(() => sendRelanceAction(devis.id))}
          className="rounded-full border border-warning px-2 py-1 text-xs text-warning hover:bg-warning hover:text-white disabled:opacity-40"
        >
          Relancer
        </button>
        {devis.statut === "SIGNE" && (
          <button
            disabled={isPending}
            onClick={() => startTransition(() => transformToFactureAction(devis.id))}
            className="rounded-full bg-brand px-2 py-1 text-xs text-white hover:bg-brand-dark disabled:opacity-40"
          >
            → Facture
          </button>
        )}
      </div>
    </div>
  );
}
