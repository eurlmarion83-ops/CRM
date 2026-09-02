"use client";

import { useEffect, useRef, useState } from "react";

export type ThreadMessage = {
  id: string;
  content: string;
  createdAt: string;
  authorLabel: string;
  mine: boolean;
};

/**
 * Fil de discussion générique, avec rafraîchissement par sondage (polling) toutes les 3 secondes.
 *
 * Note d'implémentation : un vrai temps réel (push instantané) demanderait un canal WebSocket
 * persistant, non supporté nativement par les fonctions serverless Vercel. Le polling reste
 * simple, fonctionne partout, et donne une latence de quelques secondes largement suffisante
 * pour une messagerie de cabinet. Pour du vrai push, brancher Pusher/Ably (service managé
 * compatible serverless) sans changer l'API de ce composant.
 */
export function MessageThread({
  fetchUrl,
  onSend,
  placeholder = "Écrire un message...",
}: {
  fetchUrl: string;
  onSend: (content: string) => Promise<void>;
  placeholder?: string;
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    const res = await fetch(fetchUrl);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- charge le fil au montage puis sonde à intervalle régulier
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUrl]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await onSend(draft.trim());
      setDraft("");
      await refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[60vh] flex-col rounded-xl border border-border bg-surface">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
            <span className="text-[10px] text-slate-400">{m.authorLabel}</span>
            <span
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                m.mine ? "bg-brand text-white" : "bg-brand-light text-slate-800"
              }`}
            >
              {m.content}
            </span>
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-slate-500">Aucun message pour le moment.</p>}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder={placeholder}
          className="flex-1 rounded-full border border-border px-4 py-2 text-sm"
        />
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
