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
    },
  });

  if (!practitioner) notFound();

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
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-xl font-semibold text-brand-dark">
                {practitioner.user.firstName[0]}
                {practitioner.user.lastName[0]}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  {practitioner.user.firstName} {practitioner.user.lastName}
                </h1>
                <p className="text-slate-600">{practitioner.specialty}</p>
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
    </main>
  );
}
