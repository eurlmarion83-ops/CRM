"use client";

import { useTransition } from "react";
import { markFacturePaidAction } from "./actions";

const STATUT_STYLE: Record<string, string> = {
  EMISE: "bg-brand-light text-brand-dark",
  PAYEE: "bg-success/10 text-success",
  IMPAYEE: "bg-danger/10 text-danger",
  ANNULEE: "bg-slate-100 text-slate-500",
};

export function FactureRow({ facture }: { facture: { id: string; numero: string; clientNom: string; montant: number; statut: string } }) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-t border-border">
      <td className="py-2">{facture.numero}</td>
      <td className="py-2">{facture.clientNom}</td>
      <td className="py-2">{facture.montant.toLocaleString("fr-FR")} €</td>
      <td className="py-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_STYLE[facture.statut] ?? "bg-slate-100 text-slate-500"}`}>
          {facture.statut}
        </span>
      </td>
      <td className="py-2 flex gap-2">
        <a href={`/api/factures/${facture.id}/pdf`} className="text-xs text-brand-dark underline">
          PDF
        </a>
        {facture.statut !== "PAYEE" && (
          <button
            disabled={isPending}
            onClick={() => startTransition(() => markFacturePaidAction(facture.id))}
            className="text-xs text-success underline disabled:opacity-40"
          >
            Marquer payée
          </button>
        )}
      </td>
    </tr>
  );
}
