"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getManageablePractitioners, isPatientInScope, type StaffUser } from "@/lib/agenda-data";
import { assertValidAttachment, ALLOWED_MESSAGE_ATTACHMENT_TYPES, MAX_MESSAGE_ATTACHMENT_BYTES, type AttachmentInput } from "@/lib/attachments";

async function assertConversationInScope(conversationId: string, user: StaffUser) {
  const conversation = await prisma.conversationPatient.findUniqueOrThrow({ where: { id: conversationId } });
  if (!(await isPatientInScope(conversation.patientId, user))) {
    throw new Error("Cette conversation n'appartient pas à votre cabinet.");
  }
}

export async function assignConversationAction(conversationId: string, practitionerId: string) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  await assertConversationInScope(conversationId, user);
  if (practitionerId) {
    const manageable = await getManageablePractitioners(user);
    if (!manageable.some((p) => p.id === practitionerId)) throw new Error("Praticien invalide.");
  }
  await prisma.conversationPatient.update({
    where: { id: conversationId },
    data: { assignedPractitionerId: practitionerId || null },
  });
  revalidatePath("/messagerie-patients");
}

export async function updateConversationStatutAction(conversationId: string, statut: string) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  await assertConversationInScope(conversationId, user);
  await prisma.conversationPatient.update({ where: { id: conversationId }, data: { statut } });
  revalidatePath("/messagerie-patients");
}

export async function sendStaffMessageAction(conversationId: string, content: string, attachment?: AttachmentInput) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  await assertConversationInScope(conversationId, user);
  assertValidAttachment(attachment, ALLOWED_MESSAGE_ATTACHMENT_TYPES, MAX_MESSAGE_ATTACHMENT_BYTES);
  await prisma.messagePatient.create({
    data: {
      conversationPatientId: conversationId,
      authorType: "STAFF",
      authorUserId: user.id,
      content,
      attachmentName: attachment?.name,
      attachmentType: attachment?.type,
      attachmentData: attachment?.data,
    },
  });
  await prisma.conversationPatient.update({ where: { id: conversationId }, data: { statut: "TRAITE" } });
  revalidatePath(`/messagerie-patients/${conversationId}`);
}
