import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { conversationId } = await params;
  const isMember = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: session.user.id } },
  });
  if (!isMember) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const messages = await prisma.messageInterne.findMany({
    where: { conversationId },
    include: { author: true },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      authorLabel: `${m.author.firstName} ${m.author.lastName}`,
      mine: m.authorId === session.user.id,
      attachmentName: m.attachmentName,
      attachmentType: m.attachmentType,
      attachmentData: m.attachmentData,
    })),
  });
}
