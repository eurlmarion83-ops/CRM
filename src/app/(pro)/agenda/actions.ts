"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { bookAppointment } from "@/lib/scheduling";
import { notifyAppointment } from "@/lib/notifications";
import { createNoShowTask } from "@/lib/task-automation";

export type AgendaActionState = { error?: string; success?: boolean } | undefined;

export async function createAppointmentAction(_prev: AgendaActionState, formData: FormData): Promise<AgendaActionState> {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);

  const practitionerId = String(formData.get("practitionerId") ?? "");
  const motifId = String(formData.get("motifId") ?? "");
  const startIso = String(formData.get("start") ?? "");
  const existingPatientId = String(formData.get("patientId") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!practitionerId || !motifId || !startIso) return { error: "Praticien, motif et créneau requis." };

  const motif = await prisma.motif.findUnique({ where: { id: motifId } });
  if (!motif || motif.practitionerId !== practitionerId) return { error: "Motif invalide." };
  const practitioner = await prisma.practitioner.findUnique({ where: { id: practitionerId } });
  if (!practitioner) return { error: "Praticien introuvable." };

  let patientId = existingPatientId;
  if (!patientId) {
    if (!firstName || !lastName) return { error: "Sélectionnez un patient existant ou renseignez nom/prénom." };
    const patient = await prisma.patient.create({ data: { firstName, lastName, email, phone, establishmentId: practitioner.establishmentId } });
    patientId = patient.id;
  }

  const start = new Date(startIso);
  const end = new Date(start.getTime() + motif.durationMin * 60_000);

  try {
    const appointment = await bookAppointment({
      practitionerId,
      patientId,
      motifId,
      establishmentId: practitioner.establishmentId,
      start,
      end,
      createdById: user.id,
    });

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    await notifyAppointment({
      appointmentId: appointment.id,
      kind: "CONFIRMATION",
      to: { phone: patient?.phone, email: patient?.email },
      smsBody: `Rendez-vous confirmé le ${start.toLocaleDateString("fr-FR")} à ${start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`,
      emailSubject: "Confirmation de votre rendez-vous",
      emailBody: `Votre rendez-vous du ${start.toLocaleString("fr-FR")} est confirmé.`,
      establishmentId: practitioner.establishmentId,
    });

    await prisma.journalActivite.create({
      data: { userId: user.id, action: "RENDEZVOUS_CREE_STAFF", entityType: "RendezVous", entityId: appointment.id },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_ALREADY_BOOKED") {
      return { error: "Ce créneau vient d'être réservé. Merci de recharger l'agenda." };
    }
    throw err;
  }

  revalidatePath("/agenda");
  return { success: true };
}

export async function cancelAppointmentStaffAction(appointmentId: string, reason: "CANCELLED" | "NO_SHOW") {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  await prisma.rendezVous.update({
    where: { id: appointmentId },
    data:
      reason === "NO_SHOW"
        ? { status: "NO_SHOW" }
        : { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Annulé par le cabinet" },
  });
  await prisma.journalActivite.create({
    data: { userId: user.id, action: reason === "NO_SHOW" ? "RENDEZVOUS_NOSHOW" : "RENDEZVOUS_ANNULE", entityType: "RendezVous", entityId: appointmentId },
  });
  if (reason === "NO_SHOW") {
    await createNoShowTask(appointmentId);
  }
  revalidatePath("/agenda");
  revalidatePath("/taches");
}

export async function rescheduleAppointmentAction(appointmentId: string, newStartIso: string) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const appointment = await prisma.rendezVous.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw new Error("Rendez-vous introuvable.");

  const durationMs = appointment.end.getTime() - appointment.start.getTime();
  const newStart = new Date(newStartIso);
  const newEnd = new Date(newStart.getTime() + durationMs);

  const conflict = await prisma.rendezVous.findFirst({
    where: {
      practitionerId: appointment.practitionerId,
      status: "CONFIRMED",
      id: { not: appointmentId },
      start: { lt: newEnd },
      end: { gt: newStart },
    },
  });
  if (conflict) throw new Error("SLOT_ALREADY_BOOKED");

  await prisma.rendezVous.update({ where: { id: appointmentId }, data: { start: newStart, end: newEnd } });
  await prisma.journalActivite.create({
    data: { userId: user.id, action: "RENDEZVOUS_DEPLACE", entityType: "RendezVous", entityId: appointmentId },
  });
  revalidatePath("/agenda");
}
