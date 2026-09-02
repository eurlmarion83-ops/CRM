import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getManageablePractitioners } from "@/lib/agenda-data";
import { WaitlistStaffRow } from "./waitlist-staff-row";

export default async function ListeAttentePage() {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const practitioners = await getManageablePractitioners(user);
  const practitionerIds = practitioners.map((p) => p.id);

  const entries = practitionerIds.length
    ? await prisma.listeAttente.findMany({
        where: { practitionerId: { in: practitionerIds }, statut: { in: ["ACTIVE", "NOTIFIE"] } },
        include: { patient: true, practitioner: { include: { user: true } }, motif: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Liste d&apos;attente</h1>
      <p className="text-slate-600">
        Patients en attente d&apos;un créneau. Ils sont notifiés automatiquement par SMS/email dès
        qu&apos;un rendez-vous compatible est annulé.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {entries.length === 0 && <p className="text-sm text-slate-500">Aucun patient en liste d&apos;attente.</p>}
        {entries.map((e) => (
          <WaitlistStaffRow
            key={e.id}
            entry={{
              id: e.id,
              patientName: `${e.patient.firstName} ${e.patient.lastName}`,
              patientContact: e.patient.phone ?? e.patient.email ?? "",
              practitionerName: `${e.practitioner.user.firstName} ${e.practitioner.user.lastName}`,
              motifName: e.motif.name,
              statut: e.statut,
              preferredFrom: e.preferredFrom ? e.preferredFrom.toLocaleDateString("fr-FR") : null,
              preferredTo: e.preferredTo ? e.preferredTo.toLocaleDateString("fr-FR") : null,
              createdAt: e.createdAt.toLocaleDateString("fr-FR"),
            }}
          />
        ))}
      </div>
    </main>
  );
}
