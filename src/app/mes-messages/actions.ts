"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

async function getOrCreatePatientConversation(patientId: string) {
  const existing = await prisma.conversationPatient.findFirst({ where: { patientId } });
  if (existing) return existing;
  return prisma.conversationPatient.create({ data: { patientId } });
}

export async function sendPatientMessageAction(content: string) {
  const user = await requireUser(["PATIENT"]);
  const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
  if (!patient) throw new Error("Fiche patient introuvable.");

  const conversation = await getOrCreatePatientConversation(patient.id);

  await prisma.messagePatient.create({
    data: { conversationPatientId: conversation.id, authorType: "PATIENT", authorUserId: user.id, content },
  });
  await prisma.conversationPatient.update({ where: { id: conversation.id }, data: { statut: "A_TRAITER" } });
}

export { getOrCreatePatientConversation };
