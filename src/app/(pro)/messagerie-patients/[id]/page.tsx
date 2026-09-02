import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getManageablePractitioners } from "@/lib/agenda-data";
import { PatientConversationThread } from "./thread-client";

export default async function PatientConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const { id } = await params;

  const conversation = await prisma.conversationPatient.findUnique({ where: { id }, include: { patient: true } });
  if (!conversation) notFound();

  const manageable = await getManageablePractitioners(user);

  return (
    <main className="px-6 py-8">
      <Link href="/messagerie-patients" className="text-sm text-brand-dark underline">
        ← Toutes les conversations
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">
        {conversation.patient.firstName} {conversation.patient.lastName}
      </h1>
      <div className="mt-4">
        <PatientConversationThread
          conversationId={conversation.id}
          practitioners={manageable.map((p) => ({ id: p.id, name: `${p.user.firstName} ${p.user.lastName}` }))}
          currentPractitionerId={conversation.assignedPractitionerId}
          statut={conversation.statut}
        />
      </div>
    </main>
  );
}
