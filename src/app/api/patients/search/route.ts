import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getVisiblePractitioners, getCurrentEstablishmentId } from "@/lib/agenda-data";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["PRACTITIONER", "SECRETARY", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ patients: [] });

  const [establishmentId, visiblePractitioners] = await Promise.all([
    getCurrentEstablishmentId(session.user),
    getVisiblePractitioners(session.user),
  ]);
  const practitionerIds = visiblePractitioners.map((p) => p.id);

  const patients = await prisma.patient.findMany({
    where: {
      AND: [
        {
          OR: [
            ...(establishmentId ? [{ establishmentId }] : []),
            { appointments: { some: { practitionerId: { in: practitionerIds } } } },
          ],
        },
        {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        },
      ],
    },
    take: 10,
  });

  return NextResponse.json({
    patients: patients.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, phone: p.phone, email: p.email })),
  });
}
