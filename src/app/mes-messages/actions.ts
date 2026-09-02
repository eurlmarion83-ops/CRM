"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { assertValidAttachment, ALLOWED_MESSAGE_ATTACHMENT_TYPES, MAX_MESSAGE_ATTACHMENT_BYTES, type AttachmentInput } from "@/lib/attachments";

async function getOrCreatePatientConversation(patientId: string) {
  const existing = await prisma.conversationPatient.findFirst({ where: { patientId } });
  if (existing) return existing;
  return prisma.conversationPatient.create({ data: { patientId } });
}

export async function sendPatientMessageAction(content: string, attachment?: AttachmentInput) {
  const user = await requireUser(["PATIENT"]);
  const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
  if (!patient) throw new Error("Fiche patient introuvable.");

  assertValidAttachment(attachment, ALLOWED_MESSAGE_ATTACHMENT_TYPES, MAX_MESSAGE_ATTACHMENT_BYTES);

  const conversation = await getOrCreatePatientConversation(patient.id);

  await prisma.messagePatient.create({
    data: {
      conversationPatientId: conversation.id,
      authorType: "PATIENT",
      authorUserId: user.id,
      content,
      attachmentName: attachment?.name,
      attachmentType: attachment?.type,
      attachmentData: attachment?.data,
    },
  });
  await prisma.conversationPatient.update({ where: { id: conversation.id }, data: { statut: "A_TRAITER" } });
}

export { getOrCreatePatientConversation };
