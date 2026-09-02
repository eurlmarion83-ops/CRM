"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getManageablePractitioners } from "@/lib/agenda-data";

export async function assignConversationAction(conversationId: string, practitionerId: string) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
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
  await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  await prisma.conversationPatient.update({ where: { id: conversationId }, data: { statut } });
  revalidatePath("/messagerie-patients");
}

export async function sendStaffMessageAction(conversationId: string, content: string) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  await prisma.messagePatient.create({
    data: { conversationPatientId: conversationId, authorType: "STAFF", authorUserId: user.id, content },
  });
  await prisma.conversationPatient.update({ where: { id: conversationId }, data: { statut: "TRAITE" } });
  revalidatePath(`/messagerie-patients/${conversationId}`);
}
