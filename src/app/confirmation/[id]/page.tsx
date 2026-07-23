import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { verifyAppointmentToken } from "@/lib/access-token";
import { CancelButton } from "./cancel-button";

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  const appointment = await prisma.rendezVous.findUnique({
    where: { id },
    include: { practitioner: { include: { user: true } }, motif: true, patient: true, teleconsultation: true },
  });
  if (!appointment) notFound();

  const session = await auth();
  const authorized =
    (token && verifyAppointmentToken(token) === id) ||
    (session?.user.role === "PATIENT" && appointment.patient.userId === session.user.id) ||
    (session && ["PRACTITIONER", "SECRETARY", "ADMIN"].includes(session.user.role));

  if (!authorized) notFound();

  const isCancelled = appointment.status === "CANCELLED";

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="card w-full max-w-lg p-8">
        <p className="text-sm font-medium text-success">
          {isCancelled ? "Rendez-vous annulé" : "Rendez-vous confirmé ✓"}
        </p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{appointment.motif.name}</h1>
        <p className="mt-1 text-slate-600">
          avec {appointment.practitioner.user.firstName} {appointment.practitioner.user.lastName} (
          {appointment.practitioner.specialty})
        </p>
        <p className="mt-4 text-lg font-medium text-brand-dark">
          {appointment.start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {" à "}
          {appointment.start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>
        {appointment.motif.type === "VIDEO" && appointment.teleconsultation && (
          <p className="mt-2 text-sm text-slate-600">
            Consultation vidéo — le lien vers la salle d&apos;attente virtuelle sera actif à l&apos;heure du
            rendez-vous depuis « Mes rendez-vous ».
          </p>
        )}
        {appointment.practitioner.address && (
          <p className="mt-2 text-sm text-slate-600">
            {appointment.practitioner.address}, {appointment.practitioner.city}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`/api/ics/${appointment.id}${token ? `?token=${token}` : ""}`}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-brand-light"
          >
            Ajouter à mon calendrier (.ics)
          </a>
          {!isCancelled && <CancelButton appointmentId={appointment.id} token={token} />}
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Conservez ce lien pour retrouver votre rendez-vous : c&apos;est un lien sécurisé propre à cette
          réservation.
        </p>
        <Link href="/recherche" className="mt-4 inline-block text-sm text-brand-dark underline">
          ← Retour à la recherche
        </Link>
      </div>
    </main>
  );
}
