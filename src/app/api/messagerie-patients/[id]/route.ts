import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !["PRACTITIONER", "SECRETARY", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const messages = await prisma.messagePatient.findMany({
    where: { conversationPatientId: id },
    include: { authorUser: true },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      authorLabel: m.authorType === "PATIENT" ? "Patient" : m.authorUser ? `${m.authorUser.firstName} ${m.authorUser.lastName}` : "Cabinet",
      mine: m.authorType === "STAFF",
    })),
  });
}
