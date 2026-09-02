import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getManageablePractitioners, isPatientInScope } from "@/lib/agenda-data";
import { NewDocumentForm } from "./new-document-form";
import { MergeForm } from "./merge-form";

const TYPE_LABELS: Record<string, string> = {
  ORDONNANCE: "Ordonnance",
  CERTIFICAT: "Certificat médical",
  COMPTE_RENDU: "Compte rendu de consultation",
};

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: {
        include: { practitioner: { include: { user: true } }, motif: true },
        orderBy: { start: "desc" },
      },
      documents: { orderBy: { createdAt: "desc" }, include: { practitioner: { include: { user: true } } } },
    },
  });
  if (!patient) notFound();
  if (!(await isPatientInScope(patient.id, user))) notFound();

  const manageable = await getManageablePractitioners(user);

  return (
    <main className="px-6 py-8">
      <Link href="/patients" className="text-sm text-brand-dark underline">
        ← Retour aux patients
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">
          {patient.firstName} {patient.lastName}
        </h1>
        <MergeForm patientId={patient.id} />
      </div>
      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
        <div>
          <dt className="inline font-medium">Téléphone : </dt>
          <dd className="inline">{patient.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Email : </dt>
          <dd className="inline">{patient.email ?? "—"}</dd>
        </div>
        {patient.birthDate && (
          <div>
            <dt className="inline font-medium">Naissance : </dt>
            <dd className="inline">{patient.birthDate.toLocaleDateString("fr-FR")}</dd>
          </div>
        )}
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="font-semibold text-slate-900">Historique des rendez-vous</h2>
          <div className="mt-2 flex flex-col gap-2">
            {patient.appointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span>
                  {a.start.toLocaleDateString("fr-FR")} — {a.motif.name} ({a.practitioner.user.firstName}{" "}
                  {a.practitioner.user.lastName})
                </span>
                <span className="text-xs text-slate-500">{a.status}</span>
              </div>
            ))}
            {patient.appointments.length === 0 && <p className="text-sm text-slate-500">Aucun rendez-vous.</p>}
          </div>
        </section>

        <section>
          <h2 className="font-semibold text-slate-900">Documents</h2>
          <div className="mt-2 flex flex-col gap-2">
            {patient.documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span>
                  {TYPE_LABELS[d.type] ?? d.type} — {d.title} ({d.createdAt.toLocaleDateString("fr-FR")})
                </span>
                <a href={`/api/documents/${d.id}/pdf`} className="text-xs text-brand-dark underline">
                  Télécharger le PDF
                </a>
              </div>
            ))}
            {patient.documents.length === 0 && <p className="text-sm text-slate-500">Aucun document.</p>}
          </div>
        </section>
      </div>

      <div className="mt-8">
        <NewDocumentForm patientId={patient.id} practitioners={manageable.map((p) => ({ id: p.id, name: `${p.user.firstName} ${p.user.lastName}` }))} />
      </div>
    </main>
  );
}
