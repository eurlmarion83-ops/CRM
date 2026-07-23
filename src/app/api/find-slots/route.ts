import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { findNextSlots } from "@/lib/scheduling";
import { getVisiblePractitioners } from "@/lib/agenda-data";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["PRACTITIONER", "SECRETARY", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const requested = searchParams.get("practitionerIds")?.split(",").filter(Boolean) ?? [];
  const motifType = searchParams.get("motifType") as "CABINET" | "DOMICILE" | "VIDEO" | null;
  const days = Number(searchParams.get("days") ?? "30");
  const timeStart = searchParams.get("timeStart");
  const timeEnd = searchParams.get("timeEnd");
  const weekdaysParam = searchParams.get("weekdays");

  const visible = await getVisiblePractitioners(session.user);
  const visibleIds = new Set(visible.map((p) => p.id));
  const practitionerIds = (requested.length > 0 ? requested : visible.map((p) => p.id)).filter((id) => visibleIds.has(id));

  const from = new Date();
  const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);

  const results = await findNextSlots({
    practitionerIds,
    motifType: motifType ?? undefined,
    from,
    to,
    patientView: false,
    allowedWeekdays: weekdaysParam ? weekdaysParam.split(",").map(Number) : undefined,
    timeRange: timeStart && timeEnd ? { start: timeStart, end: timeEnd } : undefined,
    limit: 30,
  });

  return NextResponse.json({
    slots: results.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      practitionerId: s.practitionerId,
      practitionerName: s.practitionerName,
      motifId: s.motifId,
      motifName: s.motifName,
    })),
  });
}
