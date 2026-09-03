import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { createConversationAction } from "./actions";

export default async function MessagerieListPage() {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);

  const [conversations, staff] = await Promise.all([
    prisma.conversation.findMany({
      where: { members: { some: { userId: user.id } } },
      include: { members: { include: { user: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { id: "desc" },
    }),
    prisma.user.findMany({ where: { role: { in: ["PRACTITIONER", "SECRETARY", "ADMIN"] }, id: { not: user.id } } }),
  ]);

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Messagerie interne</h1>
      <p className="text-slate-600">Discussions entre secrétariat et praticiens, distinctes des SMS/emails patients.</p>

      <div className="mt-6 flex flex-col gap-2">
        {conversations.map((c) => {
          const others = c.members.filter((m) => m.userId !== user.id).map((m) => `${m.user.firstName} ${m.user.lastName}`);
          const label = c.name || others.join(", ") || "Conversation";
          const lastMessage = c.messages[0];
          return (
            <Link key={c.id} href={`/messagerie/${c.id}`} className="card flex items-center gap-3 p-3 hover:border-brand">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand-dark">
                {c.isGroup ? "👥" : (label[0] ?? "?").toUpperCase()}
              </span>
              <span className="flex-1 font-medium text-slate-900">{label}</span>
              <span className="max-w-[40%] truncate text-sm text-slate-500">
                {lastMessage?.content || (lastMessage ? "📎 Pièce jointe" : "Aucun message")}
              </span>
              {lastMessage && (
                <span className="shrink-0 text-xs text-slate-400">{lastMessage.createdAt.toLocaleDateString("fr-FR")}</span>
              )}
            </Link>
          );
        })}
        {conversations.length === 0 && <p className="text-sm text-slate-500">Aucune conversation.</p>}
      </div>

      <form action={createConversationAction} className="card mt-8 flex flex-col gap-3 p-4">
        <p className="font-medium text-slate-900">Nouvelle conversation</p>
        <input name="name" placeholder="Nom du groupe (optionnel, ex: Secrétariat)" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <div className="flex flex-wrap gap-2">
          {staff.map((s) => (
            <label key={s.id} className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-sm">
              <input type="checkbox" name="memberIds" value={s.id} />
              {s.firstName} {s.lastName}
            </label>
          ))}
        </div>
        <button className="self-start rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
          Créer
        </button>
      </form>
    </main>
  );
}
