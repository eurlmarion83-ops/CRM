import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgendaAppointments, getVisiblePractitioners } from "@/lib/agenda-data";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["PRACTITIONER", "SECRETARY", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = new Date(searchParams.get("from")!);
  const to = new Date(searchParams.get("to")!);
  const requested = searchParams.get("practitionerIds")?.split(",").filter(Boolean) ?? [];

  const visible = await getVisiblePractitioners(session.user);
  const visibleIds = new Set(visible.map((p) => p.id));
  const practitionerIds = requested.filter((id) => visibleIds.has(id));

  const appointments = await getAgendaAppointments(practitionerIds, from, to);

  return NextResponse.json({
    appointments: appointments.map((a) => ({
      id: a.id,
      start: a.start.toISOString(),
      end: a.end.toISOString(),
      status: a.status,
      practitionerId: a.practitionerId,
      practitionerName: `${a.practitioner.user.firstName} ${a.practitioner.user.lastName}`,
      practitionerColor: a.practitioner.color,
      patientName: `${a.patient.firstName} ${a.patient.lastName}`,
      patientPhone: a.patient.phone,
      motifName: a.motif.name,
      motifColor: a.motif.color,
      isVideo: a.motif.type === "VIDEO",
      roomName: a.teleconsultation?.roomName ?? null,
    })),
  });
}
