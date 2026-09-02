import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { ConversationThread } from "./conversation-thread";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { members: { include: { user: true } } },
  });
  if (!conversation || !conversation.members.some((m) => m.userId === user.id)) notFound();

  const others = conversation.members.filter((m) => m.userId !== user.id).map((m) => `${m.user.firstName} ${m.user.lastName}`);
  const label = conversation.name || others.join(", ");

  return (
    <main className="px-6 py-8">
      <Link href="/messagerie" className="text-sm text-brand-dark underline">
        ← Toutes les conversations
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">{label}</h1>
      <div className="mt-4">
        <ConversationThread conversationId={conversation.id} />
      </div>
    </main>
  );
}
