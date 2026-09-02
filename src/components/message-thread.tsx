"use client";

import { useEffect, useRef, useState } from "react";
import { ALLOWED_MESSAGE_ATTACHMENT_TYPES, MAX_MESSAGE_ATTACHMENT_BYTES } from "@/lib/attachments";

export type MessageAttachment = { name: string; type: string; data: string };

export type ThreadMessage = {
  id: string;
  content: string;
  createdAt: string;
  authorLabel: string;
  mine: boolean;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentData?: string | null;
};

function AttachmentBubble({ name, type, data }: { name: string; type: string; data: string }) {
  if (type.startsWith("image/")) {
    return (
      <a href={data} target="_blank" rel="noopener noreferrer" className="mt-1 block">
        {/* eslint-disable-next-line @next/next/no-img-element -- pièce jointe encodée en base64, pas d'optimisation next/image utile */}
        <img src={data} alt={name} className="max-h-40 rounded-lg border border-border" />
      </a>
    );
  }
  return (
    <a
      href={data}
      download={name}
      className="mt-1 flex items-center gap-1 text-xs underline opacity-90 hover:opacity-100"
    >
      📎 {name}
    </a>
  );
}

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
  onSend: (content: string, attachment?: MessageAttachment) => Promise<void>;
  placeholder?: string;
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<MessageAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachmentError(null);

    if (!ALLOWED_MESSAGE_ATTACHMENT_TYPES.includes(file.type)) {
      setAttachmentError("Type de fichier non autorisé (images ou PDF uniquement).");
      return;
    }
    if (file.size > MAX_MESSAGE_ATTACHMENT_BYTES) {
      setAttachmentError("Fichier trop volumineux (5 Mo maximum).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPendingAttachment({ name: file.name, type: file.type, data: String(reader.result) });
    };
    reader.readAsDataURL(file);
  }

  async function handleSend() {
    if (!draft.trim() && !pendingAttachment) return;
    setSending(true);
    try {
      await onSend(draft.trim(), pendingAttachment ?? undefined);
      setDraft("");
      setPendingAttachment(null);
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
              {m.attachmentData && m.attachmentName && m.attachmentType && (
                <AttachmentBubble name={m.attachmentName} type={m.attachmentType} data={m.attachmentData} />
              )}
            </span>
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-slate-500">Aucun message pour le moment.</p>}
        <div ref={bottomRef} />
      </div>
      <div className="flex flex-col gap-2 border-t border-border p-3">
        {attachmentError && <p className="text-xs text-danger">{attachmentError}</p>}
        {pendingAttachment && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            📎 {pendingAttachment.name}
            <button onClick={() => setPendingAttachment(null)} className="text-danger underline">
              Retirer
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MESSAGE_ATTACHMENT_TYPES.join(",")}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Joindre un fichier"
            className="shrink-0 rounded-full border border-border px-3 py-2 text-sm hover:bg-brand-light"
          >
            📎
          </button>
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
            disabled={sending || (!draft.trim() && !pendingAttachment)}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
