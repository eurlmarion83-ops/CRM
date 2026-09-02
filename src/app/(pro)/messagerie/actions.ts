"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function createConversationAction(formData: FormData) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const memberIds = formData.getAll("memberIds").map(String);
  const name = String(formData.get("name") ?? "").trim();

  const allMemberIds = Array.from(new Set([user.id, ...memberIds]));
  if (allMemberIds.length < 2) {
    throw new Error("Sélectionnez au moins un autre participant.");
  }

  const conversation = await prisma.conversation.create({
    data: {
      name: name || null,
      isGroup: allMemberIds.length > 2,
      members: { createMany: { data: allMemberIds.map((userId) => ({ userId })) } },
    },
  });

  redirect(`/messagerie/${conversation.id}`);
}

export async function sendInternalMessageAction(conversationId: string, content: string) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const isMember = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
  });
  if (!isMember) throw new Error("Vous ne faites pas partie de cette conversation.");

  await prisma.messageInterne.create({ data: { conversationId, authorId: user.id, content } });
  revalidatePath(`/messagerie/${conversationId}`);
}
