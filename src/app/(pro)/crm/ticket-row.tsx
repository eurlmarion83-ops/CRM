"use client";

import { useTransition } from "react";
import { moveTicketStatutAction } from "./actions";

const PRIORITE_STYLES: Record<string, string> = {
  BASSE: "text-slate-500",
  NORMALE: "text-slate-700",
  HAUTE: "text-danger font-medium",
};

export function TicketRow({
  ticket,
}: {
  ticket: { id: string; titre: string; description: string | null; statut: string; priorite: string; createdAt: string };
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-t border-border align-top">
      <td className="py-2">
        <p className="font-medium text-slate-900">{ticket.titre}</p>
        {ticket.description && <p className="text-xs text-slate-500">{ticket.description}</p>}
      </td>
      <td className={`py-2 ${PRIORITE_STYLES[ticket.priorite] ?? ""}`}>{ticket.priorite}</td>
      <td className="py-2">{ticket.statut}</td>
      <td className="py-2 text-slate-500">{ticket.createdAt}</td>
      <td className="py-2 flex gap-1">
        <button
          disabled={isPending || ticket.statut === "OUVERT"}
          onClick={() => startTransition(() => moveTicketStatutAction(ticket.id, -1))}
          className="rounded-full border border-border px-2 py-1 text-xs hover:bg-brand-light disabled:opacity-40"
        >
          ←
        </button>
        <button
          disabled={isPending || ticket.statut === "RESOLU"}
          onClick={() => startTransition(() => moveTicketStatutAction(ticket.id, 1))}
          className="rounded-full border border-border px-2 py-1 text-xs hover:bg-brand-light disabled:opacity-40"
        >
          →
        </button>
      </td>
    </tr>
  );
}
