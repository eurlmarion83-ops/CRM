import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { generateDocumentPdf } from "@/lib/pdf/document";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !["PRACTITIONER", "SECRETARY", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.documentMedical.findUnique({
    where: { id },
    include: { patient: true, practitioner: { include: { user: true } } },
  });
  if (!doc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const pdfBytes = await generateDocumentPdf({
    title: doc.title,
    type: doc.type,
    content: doc.content,
    createdAt: doc.createdAt,
    practitioner: {
      firstName: doc.practitioner.user.firstName,
      lastName: doc.practitioner.user.lastName,
      specialty: doc.practitioner.specialty,
      address: doc.practitioner.address,
      city: doc.practitioner.city,
    },
    patient: { firstName: doc.patient.firstName, lastName: doc.patient.lastName, birthDate: doc.patient.birthDate },
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.type.toLowerCase()}-${doc.id}.pdf"`,
    },
  });
}
