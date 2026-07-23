import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { getAvailableSlots } from "@/lib/scheduling";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const practitionerId = searchParams.get("practitionerId");
  const motifId = searchParams.get("motifId");
  const fromParam = searchParams.get("from");
  const days = Number(searchParams.get("days") ?? "14");

  if (!practitionerId || !motifId) {
    return NextResponse.json({ error: "practitionerId et motifId requis" }, { status: 400 });
  }

  const from = fromParam ? new Date(fromParam) : new Date();
  const to = addDays(from, days);

  const slots = await getAvailableSlots(practitionerId, motifId, {
    from,
    to,
    patientView: true,
  });

  return NextResponse.json({
    slots: slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
  });
}
