import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { verifyAppointmentToken } from "@/lib/access-token";
import { buildAppointmentIcs } from "@/lib/ics";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token") ?? "";

  const appointment = await prisma.rendezVous.findUnique({
    where: { id },
    include: { practitioner: { include: { user: true } }, motif: true, patient: true },
  });
  if (!appointment) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const session = await auth();
  const authorized =
    verifyAppointmentToken(token) === id ||
    (session?.user.role === "PATIENT" && appointment.patient.userId === session.user.id) ||
    (session && ["PRACTITIONER", "SECRETARY", "ADMIN"].includes(session.user.role));

  if (!authorized) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const ics = buildAppointmentIcs({
    uid: appointment.id,
    title: `${appointment.motif.name} — Dr ${appointment.practitioner.user.lastName}`,
    description: `Rendez-vous ${appointment.motif.name} avec ${appointment.practitioner.user.firstName} ${appointment.practitioner.user.lastName}.`,
    location: appointment.practitioner.address ?? appointment.practitioner.city ?? "",
    start: appointment.start,
    end: appointment.end,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="rendez-vous-${appointment.id}.ics"`,
    },
  });
}
