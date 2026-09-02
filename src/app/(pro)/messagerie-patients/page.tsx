import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getVisiblePractitioners, getCurrentEstablishmentId } from "@/lib/agenda-data";

export default async function MessagerieePatientsPage() {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);

  const [establishmentId, visiblePractitioners] = await Promise.all([
    getCurrentEstablishmentId(user),
    getVisiblePractitioners(user),
  ]);
  const practitionerIds = visiblePractitioners.map((p) => p.id);

  const conversations = await prisma.conversationPatient.findMany({
    where: {
      patient: {
        OR: [
          ...(establishmentId ? [{ establishmentId }] : []),
          { appointments: { some: { practitionerId: { in: practitionerIds } } } },
        ],
      },
    },
    include: {
      patient: true,
      assignedPractitioner: { include: { user: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ statut: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Messagerie patients</h1>
      <p className="text-slate-600">Échanges sécurisés avec les patients, distincts des SMS/emails automatiques.</p>

      <div className="mt-6 flex flex-col gap-2">
        {conversations.map((c) => (
          <Link
            key={c.id}
            href={`/messagerie-patients/${c.id}`}
            className="card flex items-center justify-between p-3 hover:border-brand"
          >
            <div>
              <p className="font-medium text-slate-900">
                {c.patient.firstName} {c.patient.lastName}
              </p>
              <p className="max-w-md truncate text-sm text-slate-500">{c.messages[0]?.content ?? "Aucun message"}</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {c.assignedPractitioner && (
                <span className="rounded-full border border-border px-2 py-1">
                  {c.assignedPractitioner.user.firstName} {c.assignedPractitioner.user.lastName}
                </span>
              )}
              <span className={`rounded-full px-2 py-1 ${c.statut === "A_TRAITER" ? "bg-warning/20 text-warning" : "bg-success/20 text-success"}`}>
                {c.statut === "A_TRAITER" ? "À traiter" : "Traité"}
              </span>
            </div>
          </Link>
        ))}
        {conversations.length === 0 && <p className="text-sm text-slate-500">Aucune conversation patient.</p>}
      </div>
    </main>
  );
}
