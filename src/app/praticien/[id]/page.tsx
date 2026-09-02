import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { BookingWizard } from "./booking-wizard";
import type { MotifType } from "@/lib/enums";

export default async function PraticienPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const practitioner = await prisma.practitioner.findUnique({
    where: { id },
    include: {
      user: true,
      establishment: true,
      motifs: { where: { onlineBookable: true, active: true }, orderBy: { sortOrder: "asc" } },
      avis: { where: { publie: true }, include: { patient: true }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!practitioner) notFound();

  const avisCount = practitioner.avis.length;
  const avisMoyenne = avisCount > 0 ? practitioner.avis.reduce((s, a) => s + a.note, 0) / avisCount : null;

  const session = await auth();
  let patient = null;
  if (session?.user.role === "PATIENT") {
    patient = await prisma.patient.findUnique({ where: { userId: session.user.id } });
  }

  return (
    <main className="flex-1">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-brand-dark">
            MedCRM
          </Link>
          <Link href="/recherche" className="text-sm hover:text-brand-dark">
            ← Retour à la recherche
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-8 px-6 py-8 md:grid-cols-[2fr_3fr]">
        <div>
          <div className="card p-6">
            <div className="flex items-center gap-4">
              {practitioner.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- photo encodée en base64, pas d'optimisation next/image utile
                <img src={practitioner.photoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-xl font-semibold text-brand-dark">
                  {practitioner.user.firstName[0]}
                  {practitioner.user.lastName[0]}
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  {practitioner.user.firstName} {practitioner.user.lastName}
                </h1>
                <p className="text-slate-600">{practitioner.specialty}</p>
                {avisMoyenne !== null && (
                  <p className="mt-1 text-sm text-warning">
                    {"★".repeat(Math.round(avisMoyenne))}
                    {"☆".repeat(5 - Math.round(avisMoyenne))}{" "}
                    <span className="text-slate-500">
                      {avisMoyenne.toFixed(1)}/5 ({avisCount} avis)
                    </span>
                  </p>
                )}
              </div>
            </div>
            {practitioner.bio && <p className="mt-4 text-sm text-slate-600">{practitioner.bio}</p>}
            <dl className="mt-4 space-y-2 text-sm text-slate-600">
              <div>
                <dt className="font-medium text-slate-800">Adresse</dt>
                <dd>
                  {practitioner.address}
                  {practitioner.address ? ", " : ""}
                  {practitioner.city}
                </dd>
              </div>
              {practitioner.establishment && (
                <div>
                  <dt className="font-medium text-slate-800">Établissement</dt>
                  <dd>{practitioner.establishment.name}</dd>
                </div>
              )}
              {practitioner.paymentMethods && (
                <div>
                  <dt className="font-medium text-slate-800">Moyens de paiement</dt>
                  <dd>{practitioner.paymentMethods}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div>
          <BookingWizard
            practitionerId={practitioner.id}
            motifs={practitioner.motifs.map((m) => ({ ...m, type: m.type as MotifType }))}
            defaultFirstName={patient?.firstName ?? session?.user.name?.split(" ")[0]}
            defaultLastName={patient?.lastName}
            defaultEmail={patient?.email ?? session?.user.email ?? undefined}
            defaultPhone={patient?.phone ?? undefined}
          />
        </div>
      </section>

      {practitioner.avis.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 pb-12">
          <h2 className="text-lg font-semibold text-slate-900">Avis patients</h2>
          <div className="mt-3 flex flex-col gap-3">
            {practitioner.avis.map((a) => (
              <div key={a.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-warning">
                    {"★".repeat(a.note)}
                    {"☆".repeat(5 - a.note)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {a.patient.firstName} {a.patient.lastName[0]}. — {a.createdAt.toLocaleDateString("fr-FR")}
                  </span>
                </div>
                {a.commentaire && <p className="mt-2 text-sm text-slate-600">{a.commentaire}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
