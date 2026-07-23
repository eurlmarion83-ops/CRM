import { startOfWeek, endOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getVisiblePractitioners, getAgendaAppointments } from "@/lib/agenda-data";
import { AgendaClient } from "./agenda-client";

export default async function AgendaPage() {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const practitioners = await getVisiblePractitioners(user);
  const practitionerIds = practitioners.map((p) => p.id);

  const from = startOfWeek(new Date(), { weekStartsOn: 1 });
  const to = endOfWeek(new Date(), { weekStartsOn: 1 });
  const initialAppointments = await getAgendaAppointments(practitionerIds, from, to);

  const motifsByPractitioner = await prisma.motif.findMany({
    where: { practitionerId: { in: practitionerIds }, active: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <AgendaClient
      practitioners={practitioners.map((p) => ({
        id: p.id,
        name: `${p.user.firstName} ${p.user.lastName}`,
        color: p.color,
      }))}
      motifs={motifsByPractitioner.map((m) => ({
        id: m.id,
        practitionerId: m.practitionerId,
        name: m.name,
        color: m.color,
        durationMin: m.durationMin,
        type: m.type as "CABINET" | "DOMICILE" | "VIDEO",
      }))}
      initialAppointments={initialAppointments.map((a) => ({
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
      }))}
    />
  );
}
