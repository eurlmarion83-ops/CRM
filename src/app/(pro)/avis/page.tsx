import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getManageablePractitioners } from "@/lib/agenda-data";
import { AvisRow } from "./avis-row";

export default async function AvisPage() {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const practitioners = await getManageablePractitioners(user);
  const practitionerIds = practitioners.map((p) => p.id);

  const avisList = practitionerIds.length
    ? await prisma.avis.findMany({
        where: { practitionerId: { in: practitionerIds } },
        include: { patient: true, practitioner: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const moyenne = avisList.length > 0 ? avisList.reduce((s, a) => s + a.note, 0) / avisList.length : null;

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Avis patients</h1>
      <p className="text-slate-600">
        {moyenne !== null
          ? `Note moyenne : ${moyenne.toFixed(1)}/5 sur ${avisList.length} avis.`
          : "Aucun avis pour le moment."}
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {avisList.map((a) => (
          <AvisRow
            key={a.id}
            avis={{
              id: a.id,
              note: a.note,
              commentaire: a.commentaire,
              publie: a.publie,
              createdAt: a.createdAt.toLocaleDateString("fr-FR"),
              patientName: `${a.patient.firstName} ${a.patient.lastName}`,
              practitionerName: `${a.practitioner.user.firstName} ${a.practitioner.user.lastName}`,
            }}
          />
        ))}
      </div>
    </main>
  );
}
