import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Export RGPD (portabilité des données) : toutes les données personnelles du patient connecté. */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const patient = await prisma.patient.findUnique({
    where: { userId: session.user.id },
    include: {
      appointments: { include: { practitioner: { include: { user: true } }, motif: true } },
      documents: true,
      conversationsPatient: { include: { messages: true } },
    },
  });

  if (!patient) return NextResponse.json({ error: "Fiche patient introuvable" }, { status: 404 });

  const exportData = {
    exportedAt: new Date().toISOString(),
    identite: {
      prenom: patient.firstName,
      nom: patient.lastName,
      email: patient.email,
      telephone: patient.phone,
      dateNaissance: patient.birthDate,
      adresse: patient.address,
      ville: patient.city,
    },
    rendezVous: patient.appointments.map((a) => ({
      date: a.start,
      motif: a.motif.name,
      praticien: `${a.practitioner.user.firstName} ${a.practitioner.user.lastName}`,
      statut: a.status,
    })),
    documents: patient.documents.map((d) => ({
      type: d.type,
      titre: d.title,
      contenu: d.content,
      date: d.createdAt,
    })),
    messages: patient.conversationsPatient.flatMap((c) =>
      c.messages.map((m) => ({ auteur: m.authorType === "PATIENT" ? "Vous" : "Cabinet", contenu: m.content, date: m.createdAt }))
    ),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mes-donnees-medcrm.json"`,
    },
  });
}
