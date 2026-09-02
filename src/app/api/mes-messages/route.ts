import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } });
  if (!patient) return NextResponse.json({ messages: [] });

  const conversation = await prisma.conversationPatient.findFirst({ where: { patientId: patient.id } });
  if (!conversation) return NextResponse.json({ messages: [] });

  const messages = await prisma.messagePatient.findMany({
    where: { conversationPatientId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      authorLabel: m.authorType === "PATIENT" ? "Vous" : "Cabinet",
      mine: m.authorType === "PATIENT",
    })),
  });
}
