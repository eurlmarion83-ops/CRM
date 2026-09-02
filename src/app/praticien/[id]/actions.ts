"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { bookAppointment } from "@/lib/scheduling";
import { notifyAppointment } from "@/lib/notifications";
import { signAppointmentToken } from "@/lib/access-token";

export type BookState = { error?: string } | undefined;

export async function bookAction(_prevState: BookState, formData: FormData): Promise<BookState> {
  const practitionerId = String(formData.get("practitionerId") ?? "");
  const motifId = String(formData.get("motifId") ?? "");
  const startIso = String(formData.get("start") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!practitionerId || !motifId || !startIso || !firstName || !lastName || (!email && !phone)) {
    return { error: "Merci de compléter tous les champs obligatoires." };
  }

  const motif = await prisma.motif.findUnique({ where: { id: motifId } });
  if (!motif || motif.practitionerId !== practitionerId || !motif.onlineBookable || !motif.active) {
    return { error: "Ce motif n'est plus disponible en ligne." };
  }

  const practitioner = await prisma.practitioner.findUnique({ where: { id: practitionerId } });
  if (!practitioner) return { error: "Praticien introuvable." };

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime()) || start < new Date()) {
    return { error: "Ce créneau n'est plus valide, merci d'en choisir un autre." };
  }
  const end = new Date(start.getTime() + motif.durationMin * 60_000);

  const session = await auth();
  let patientId: string;

  if (session?.user.role === "PATIENT") {
    const patient = await prisma.patient.upsert({
      where: { userId: session.user.id },
      update: { firstName, lastName, email, phone },
      create: { userId: session.user.id, firstName, lastName, email, phone, establishmentId: practitioner.establishmentId },
    });
    patientId = patient.id;
  } else {
    const existing = email ? await prisma.patient.findFirst({ where: { email, userId: null } }) : null;
    const patient = existing
      ? await prisma.patient.update({ where: { id: existing.id }, data: { firstName, lastName, phone } })
      : await prisma.patient.create({ data: { firstName, lastName, email, phone, establishmentId: practitioner.establishmentId } });
    patientId = patient.id;
  }

  let appointmentId: string;
  try {
    const appointment = await bookAppointment({
      practitionerId,
      patientId,
      motifId,
      establishmentId: practitioner.establishmentId,
      start,
      end,
      createdById: session?.user.id,
      notes,
    });
    appointmentId = appointment.id;
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_ALREADY_BOOKED") {
      return { error: "Ce créneau vient d'être réservé par quelqu'un d'autre. Merci d'en choisir un autre." };
    }
    throw err;
  }

  await prisma.journalActivite.create({
    data: {
      userId: session?.user.id,
      action: "RENDEZVOUS_CREE",
      entityType: "RendezVous",
      entityId: appointmentId,
    },
  });

  await notifyAppointment({
    appointmentId,
    kind: "CONFIRMATION",
    to: { phone, email },
    smsBody: `Rendez-vous confirmé le ${start.toLocaleDateString("fr-FR")} à ${start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`,
    emailSubject: "Confirmation de votre rendez-vous",
    emailBody: `Votre rendez-vous du ${start.toLocaleString("fr-FR")} est confirmé. Vous pouvez le consulter/annuler depuis le lien fourni.`,
    establishmentId: practitioner.establishmentId,
  });

  const token = signAppointmentToken(appointmentId);
  redirect(`/confirmation/${appointmentId}?token=${token}`);
}

export type WaitlistState = { error?: string; success?: boolean } | undefined;

export async function joinWaitlistAction(_prevState: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const practitionerId = String(formData.get("practitionerId") ?? "");
  const motifId = String(formData.get("motifId") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const preferredFromStr = String(formData.get("preferredFrom") ?? "").trim();
  const preferredToStr = String(formData.get("preferredTo") ?? "").trim();

  if (!practitionerId || !motifId || !firstName || !lastName || (!email && !phone)) {
    return { error: "Merci de compléter tous les champs obligatoires." };
  }

  const motif = await prisma.motif.findUnique({ where: { id: motifId } });
  if (!motif || motif.practitionerId !== practitionerId || !motif.onlineBookable || !motif.active) {
    return { error: "Ce motif n'est plus disponible en ligne." };
  }

  const practitioner = await prisma.practitioner.findUnique({ where: { id: practitionerId } });
  if (!practitioner) return { error: "Praticien introuvable." };

  const session = await auth();
  let patientId: string;

  if (session?.user.role === "PATIENT") {
    const patient = await prisma.patient.upsert({
      where: { userId: session.user.id },
      update: { firstName, lastName, email, phone },
      create: { userId: session.user.id, firstName, lastName, email, phone, establishmentId: practitioner.establishmentId },
    });
    patientId = patient.id;
  } else {
    const existing = email ? await prisma.patient.findFirst({ where: { email, userId: null } }) : null;
    const patient = existing
      ? await prisma.patient.update({ where: { id: existing.id }, data: { firstName, lastName, phone } })
      : await prisma.patient.create({ data: { firstName, lastName, email, phone, establishmentId: practitioner.establishmentId } });
    patientId = patient.id;
  }

  const alreadyActive = await prisma.listeAttente.findFirst({
    where: { practitionerId, motifId, patientId, statut: { in: ["ACTIVE", "NOTIFIE"] } },
  });
  if (alreadyActive) {
    return { error: "Vous êtes déjà inscrit(e) sur la liste d'attente pour ce motif." };
  }

  const preferredFrom = preferredFromStr ? new Date(`${preferredFromStr}T00:00:00`) : null;
  const preferredTo = preferredToStr ? new Date(`${preferredToStr}T23:59:59`) : null;

  await prisma.listeAttente.create({
    data: {
      practitionerId,
      motifId,
      patientId,
      preferredFrom: preferredFrom && !Number.isNaN(preferredFrom.getTime()) ? preferredFrom : null,
      preferredTo: preferredTo && !Number.isNaN(preferredTo.getTime()) ? preferredTo : null,
    },
  });

  await prisma.journalActivite.create({
    data: { userId: session?.user.id, action: "LISTE_ATTENTE_INSCRIPTION", entityType: "ListeAttente", entityId: practitionerId },
  });

  return { success: true };
}
