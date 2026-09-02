"use client";

import { useTransition } from "react";
import { MessageThread } from "@/components/message-thread";
import { sendStaffMessageAction, assignConversationAction, updateConversationStatutAction } from "../actions";

export function PatientConversationThread({
  conversationId,
  practitioners,
  currentPractitionerId,
  statut,
}: {
  conversationId: string;
  practitioners: { id: string; name: string }[];
  currentPractitionerId: string | null;
  statut: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Assigné à
          <select
            defaultValue={currentPractitionerId ?? ""}
            disabled={isPending}
            onChange={(e) => startTransition(() => assignConversationAction(conversationId, e.target.value))}
            className="rounded-lg border border-border px-2 py-1"
          >
            <option value="">Non assigné</option>
            {practitioners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Statut
          <select
            defaultValue={statut}
            disabled={isPending}
            onChange={(e) => startTransition(() => updateConversationStatutAction(conversationId, e.target.value))}
            className="rounded-lg border border-border px-2 py-1"
          >
            <option value="A_TRAITER">À traiter</option>
            <option value="TRAITE">Traité</option>
          </select>
        </label>
      </div>
      <MessageThread
        fetchUrl={`/api/messagerie-patients/${conversationId}`}
        onSend={(content) => sendStaffMessageAction(conversationId, content)}
        placeholder="Répondre au patient..."
      />
    </div>
  );
}
