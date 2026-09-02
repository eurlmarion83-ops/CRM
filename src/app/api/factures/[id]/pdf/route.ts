import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { generateFacturePdf } from "@/lib/pdf/facture";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !["SECRETARY", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const facture = await prisma.facture.findUnique({ where: { id }, include: { devis: true } });
  if (!facture) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const pdfBytes = await generateFacturePdf({
    numero: facture.numero,
    clientNom: facture.clientNom,
    objet: facture.devis?.objet ?? "Prestation",
    montant: facture.montant,
    dateEmission: facture.dateEmission,
    dateEcheance: facture.dateEcheance,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="facture-${facture.numero}.pdf"`,
    },
  });
}
