"use client";

import { useTransition } from "react";
import { markFacturePaidAction } from "./actions";

export function FactureRow({ facture }: { facture: { id: string; numero: string; clientNom: string; montant: number; statut: string } }) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-t border-border">
      <td className="py-2">{facture.numero}</td>
      <td className="py-2">{facture.clientNom}</td>
      <td className="py-2">{facture.montant.toLocaleString("fr-FR")} €</td>
      <td className="py-2">{facture.statut}</td>
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
