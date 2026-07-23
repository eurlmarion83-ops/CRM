"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { verifyAppointmentToken } from "@/lib/access-token";
import { notifyAppointment } from "@/lib/notifications";

export type CancelState = { error?: string; success?: boolean } | undefined;

export async function cancelAppointmentAction(_prev: CancelState, formData: FormData): Promise<CancelState> {
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const token = String(formData.get("token") ?? "");

  const appointment = await prisma.rendezVous.findUnique({
    where: { id: appointmentId },
    include: { practitioner: true, patient: true },
  });
  if (!appointment) return { error: "Rendez-vous introuvable." };

  const session = await auth();
  const isOwnerByToken = token && verifyAppointmentToken(token) === appointmentId;
  const isOwnerBySession = session?.user.role === "PATIENT" && appointment.patient.userId === session.user.id;
  const isStaff = session?.user.role === "PRACTITIONER" || session?.user.role === "SECRETARY" || session?.user.role === "ADMIN";

  if (!isOwnerByToken && !isOwnerBySession && !isStaff) {
    return { error: "Vous n'êtes pas autorisé à annuler ce rendez-vous." };
  }

  if (appointment.status !== "CONFIRMED") {
    return { error: "Ce rendez-vous n'est plus actif." };
  }

  const deadlineMs = appointment.practitioner.cancellationDeadlineH * 60 * 60 * 1000;
  if (!isStaff && appointment.start.getTime() - Date.now() < deadlineMs) {
    return {
      error: `Ce rendez-vous ne peut plus être annulé en ligne (délai de ${appointment.practitioner.cancellationDeadlineH}h dépassé). Merci de contacter le cabinet.`,
    };
  }

  await prisma.rendezVous.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: isStaff ? "Annulé par le cabinet" : "Annulé par le patient" },
  });

  await prisma.journalActivite.create({
    data: { userId: session?.user.id, action: "RENDEZVOUS_ANNULE", entityType: "RendezVous", entityId: appointmentId },
  });

  await notifyAppointment({
    appointmentId,
    kind: "CANCELLATION",
    to: { phone: appointment.patient.phone, email: appointment.patient.email },
    smsBody: `Votre rendez-vous du ${appointment.start.toLocaleDateString("fr-FR")} a été annulé.`,
    emailSubject: "Annulation de votre rendez-vous",
    emailBody: `Votre rendez-vous du ${appointment.start.toLocaleString("fr-FR")} a été annulé.`,
    establishmentId: appointment.establishmentId,
  });

  revalidatePath("/mes-rendez-vous");
  return { success: true };
}
