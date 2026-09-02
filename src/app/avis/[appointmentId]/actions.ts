"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export type AvisState = { error?: string } | undefined;

export async function createAvisAction(_prev: AvisState, formData: FormData): Promise<AvisState> {
  const user = await requireUser(["PATIENT"]);
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const note = Number(formData.get("note") ?? 0);
  const commentaire = String(formData.get("commentaire") ?? "").trim();

  if (note < 1 || note > 5) return { error: "Merci de choisir une note entre 1 et 5." };

  const appointment = await prisma.rendezVous.findUnique({ where: { id: appointmentId }, include: { patient: true, avis: true } });
  if (!appointment) return { error: "Rendez-vous introuvable." };
  if (appointment.patient.userId !== user.id) return { error: "Ce rendez-vous ne vous appartient pas." };
  if (appointment.start > new Date()) return { error: "Vous ne pouvez laisser un avis qu'après le rendez-vous." };
  if (appointment.status === "CANCELLED") return { error: "Ce rendez-vous a été annulé." };
  if (appointment.avis) return { error: "Vous avez déjà laissé un avis pour ce rendez-vous." };

  await prisma.avis.create({
    data: {
      practitionerId: appointment.practitionerId,
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      note,
      commentaire: commentaire || null,
    },
  });

  redirect(`/mes-rendez-vous?avis=merci`);
}
