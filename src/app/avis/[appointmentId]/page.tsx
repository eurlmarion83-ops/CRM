import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { AvisForm } from "./avis-form";

export default async function LaisserAvisPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const user = await requireUser(["PATIENT"]);
  const { appointmentId } = await params;

  const appointment = await prisma.rendezVous.findUnique({
    where: { id: appointmentId },
    include: { practitioner: { include: { user: true } }, patient: true, avis: true, motif: true },
  });
  if (!appointment || appointment.patient.userId !== user.id) notFound();

  if (appointment.avis) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <p className="card p-8 text-slate-600">Vous avez déjà laissé un avis pour ce rendez-vous. Merci !</p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-xl font-semibold text-slate-900">
          Votre avis sur {appointment.practitioner.user.firstName} {appointment.practitioner.user.lastName}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {appointment.motif.name} — {appointment.start.toLocaleDateString("fr-FR")}
        </p>
        <div className="mt-6">
          <AvisForm appointmentId={appointment.id} />
        </div>
      </div>
    </main>
  );
}
