import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { signOut } from "@/auth";
import { WaitlistRow } from "./waitlist-row";

export default async function MesRendezVousPage({
  searchParams,
}: {
  searchParams: Promise<{ avis?: string }>;
}) {
  const user = await requireUser(["PATIENT"]);
  const { avis } = await searchParams;

  const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
  const appointments = patient
    ? await prisma.rendezVous.findMany({
        where: { patientId: patient.id },
        include: { practitioner: { include: { user: true } }, motif: true, teleconsultation: true, avis: true },
        orderBy: { start: "desc" },
      })
    : [];

  const now = new Date();
  const upcoming = appointments.filter((a) => a.start >= now && a.status === "CONFIRMED");
  const past = appointments.filter((a) => a.start < now || a.status !== "CONFIRMED");

  const waitlistEntries = patient
    ? await prisma.listeAttente.findMany({
        where: { patientId: patient.id, statut: { in: ["ACTIVE", "NOTIFIE"] } },
        include: { practitioner: { include: { user: true } }, motif: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <main className="flex-1">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-brand-dark">
            MedCRM
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/recherche" className="hover:text-brand-dark">
              Prendre un nouveau RDV
            </Link>
            <Link href="/mes-messages" className="hover:text-brand-dark">
              Messagerie
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className="hover:text-brand-dark">Déconnexion</button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Mes rendez-vous</h1>
        {avis === "merci" && (
          <p className="mt-2 rounded-lg bg-success/10 p-3 text-sm text-success">Merci pour votre avis !</p>
        )}

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">À venir</h2>
        <div className="mt-2 flex flex-col gap-3">
          {upcoming.length === 0 && <p className="text-sm text-slate-500">Aucun rendez-vous à venir.</p>}
          {upcoming.map((a) => (
            <div key={a.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-slate-900">{a.motif.name}</p>
                <p className="text-sm text-slate-600">
                  {a.practitioner.user.firstName} {a.practitioner.user.lastName} —{" "}
                  {a.start.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {a.teleconsultation && (
                  <Link
                    href={`/consultation/${a.teleconsultation.roomName}`}
                    className="rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
                  >
                    Rejoindre la visio
                  </Link>
                )}
                <Link
                  href={`/confirmation/${a.id}`}
                  className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-brand-light"
                >
                  Détails
                </Link>
              </div>
            </div>
          ))}
        </div>

        {waitlistEntries.length > 0 && (
          <>
            <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Liste d&apos;attente</h2>
            <div className="mt-2 flex flex-col gap-2">
              {waitlistEntries.map((w) => (
                <WaitlistRow
                  key={w.id}
                  entry={{
                    id: w.id,
                    practitionerName: `${w.practitioner.user.firstName} ${w.practitioner.user.lastName}`,
                    motifName: w.motif.name,
                    statut: w.statut,
                    createdAt: w.createdAt.toLocaleDateString("fr-FR"),
                  }}
                />
              ))}
            </div>
          </>
        )}

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Historique</h2>
        <div className="mt-2 flex flex-col gap-2">
          {past.length === 0 && <p className="text-sm text-slate-500">Aucun historique.</p>}
          {past.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-2 text-sm">
              <span>
                {a.motif.name} — {a.practitioner.user.firstName} {a.practitioner.user.lastName}
              </span>
              <span className="flex items-center gap-2 text-slate-500">
                {a.start.toLocaleDateString("fr-FR")} · {a.status}
                {a.status !== "CANCELLED" && !a.avis && a.start < now && (
                  <Link href={`/avis/${a.id}`} className="text-brand-dark underline">
                    Laisser un avis
                  </Link>
                )}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-slate-500">
          <a href="/api/mes-donnees/export" className="text-brand-dark underline">
            Télécharger mes données
          </a>{" "}
          (export RGPD — portabilité de vos rendez-vous, documents et messages).
        </p>
      </section>
    </main>
  );
}
