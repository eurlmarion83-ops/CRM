import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { verifyAppointmentToken } from "@/lib/access-token";
import { startAppointmentPayment } from "@/lib/payments";

export async function GET(req: NextRequest) {
  const appointmentId = req.nextUrl.searchParams.get("appointmentId");
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!appointmentId) return NextResponse.json({ error: "appointmentId requis" }, { status: 400 });

  const appointment = await prisma.rendezVous.findUnique({ where: { id: appointmentId }, include: { patient: true } });
  if (!appointment) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const session = await auth();
  const authorized =
    (token && verifyAppointmentToken(token) === appointmentId) ||
    (session?.user.role === "PATIENT" && appointment.patient.userId === session.user.id) ||
    (session && ["PRACTITIONER", "SECRETARY", "ADMIN"].includes(session.user.role));
  if (!authorized) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const baseUrl = req.nextUrl.origin;
    const checkoutUrl = await startAppointmentPayment(appointmentId, baseUrl);
    return NextResponse.redirect(new URL(checkoutUrl, baseUrl));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur de paiement" }, { status: 400 });
  }
}
