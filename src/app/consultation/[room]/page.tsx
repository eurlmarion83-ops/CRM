import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { verifyAppointmentToken } from "@/lib/access-token";
import { JitsiRoom } from "./jitsi-room";

const JOIN_WINDOW_MIN_BEFORE = 10;

export default async function ConsultationPage({
  params,
  searchParams,
}: {
  params: Promise<{ room: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { room } = await params;
  const { token } = await searchParams;

  const teleconsultation = await prisma.teleconsultation.findUnique({
    where: { roomName: room },
    include: {
      appointment: {
        include: { practitioner: { include: { user: true } }, patient: true, motif: true },
      },
    },
  });
  if (!teleconsultation) notFound();

  const { appointment } = teleconsultation;
  const session = await auth();
  const isPatientOwner =
    (token && verifyAppointmentToken(token) === appointment.id) ||
    (session?.user.role === "PATIENT" && appointment.patient.userId === session.user.id);
  const isPractitionerOwner = session?.user.role === "PRACTITIONER" && appointment.practitioner.userId === session.user.id;

  if (!isPatientOwner && !isPractitionerOwner) notFound();

  if (appointment.status !== "CONFIRMED") {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <p className="card p-8 text-slate-600">Ce rendez-vous n&apos;est plus actif.</p>
      </main>
    );
  }

  const now = new Date();
  const joinOpensAt = new Date(appointment.start.getTime() - JOIN_WINDOW_MIN_BEFORE * 60_000);
  const canJoin = isPractitionerOwner || now >= joinOpensAt;

  if (!canJoin) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="card p-8 text-center">
          <p className="text-slate-600">Votre téléconsultation n&apos;est pas encore ouverte.</p>
          <p className="mt-2 font-medium text-brand-dark">
            Rendez-vous à {appointment.start.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
          </p>
          <p className="mt-1 text-xs text-slate-500">La salle ouvre {JOIN_WINDOW_MIN_BEFORE} minutes avant l&apos;heure.</p>
        </div>
      </main>
    );
  }

  if (isPractitionerOwner) {
    await prisma.teleconsultation.update({
      where: { id: teleconsultation.id },
      data: { status: "ACTIVE", practitionerJoinedAt: new Date() },
    });
  } else {
    await prisma.teleconsultation.update({
      where: { id: teleconsultation.id },
      data: { patientJoinedAt: new Date(), status: "WAITING_ROOM" },
    });
  }

  return (
    <main className="flex-1 flex flex-col gap-4 px-4 py-6">
      <div className="mx-auto w-full max-w-4xl flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-slate-900">{appointment.motif.name}</h1>
          <p className="text-sm text-slate-600">
            {appointment.practitioner.user.firstName} {appointment.practitioner.user.lastName} —{" "}
            {appointment.start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <Link href={isPractitionerOwner ? "/agenda" : "/mes-rendez-vous"} className="text-sm text-brand-dark underline">
          Quitter
        </Link>
      </div>
      <div className="mx-auto w-full max-w-4xl flex-1">
        <JitsiRoom
          roomName={teleconsultation.roomName}
          displayName={
            isPractitionerOwner
              ? `Dr ${appointment.practitioner.user.lastName}`
              : `${appointment.patient.firstName} ${appointment.patient.lastName}`
          }
          isPractitioner={isPractitionerOwner}
        />
      </div>
    </main>
  );
}
