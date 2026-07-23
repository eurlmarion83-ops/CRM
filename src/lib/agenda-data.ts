import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/enums";

export type StaffUser = { id: string; role: Role };

/** Praticiens visibles par un membre du personnel (agenda partagé multi-praticiens). */
export async function getVisiblePractitioners(user: StaffUser) {
  if (user.role === "ADMIN") {
    return prisma.practitioner.findMany({ include: { user: true }, orderBy: { user: { lastName: "asc" } } });
  }

  if (user.role === "PRACTITIONER") {
    const me = await prisma.practitioner.findUnique({ where: { userId: user.id } });
    if (!me) return [];
    if (!me.establishmentId) {
      return prisma.practitioner.findMany({ where: { id: me.id }, include: { user: true } });
    }
    return prisma.practitioner.findMany({
      where: { establishmentId: me.establishmentId },
      include: { user: true },
      orderBy: { user: { lastName: "asc" } },
    });
  }

  if (user.role === "SECRETARY") {
    const secretary = await prisma.secretaryProfile.findUnique({
      where: { userId: user.id },
      include: { practitioners: { include: { practitioner: { include: { user: true } } } } },
    });
    return secretary?.practitioners.map((a) => a.practitioner) ?? [];
  }

  return [];
}

/**
 * Praticiens dont l'utilisateur peut gérer les motifs / disponibilités (contrairement à
 * l'agenda partagé, un praticien ne gère que ses propres motifs, pas ceux de ses confrères).
 */
export async function getManageablePractitioners(user: StaffUser) {
  if (user.role === "PRACTITIONER") {
    const me = await prisma.practitioner.findUnique({ where: { userId: user.id }, include: { user: true } });
    return me ? [me] : [];
  }
  return getVisiblePractitioners(user);
}

export async function getAgendaAppointments(practitionerIds: string[], from: Date, to: Date) {
  if (practitionerIds.length === 0) return [];
  return prisma.rendezVous.findMany({
    where: {
      practitionerId: { in: practitionerIds },
      start: { lt: to },
      end: { gt: from },
    },
    include: {
      practitioner: { include: { user: true } },
      patient: true,
      motif: true,
      teleconsultation: true,
    },
    orderBy: { start: "asc" },
  });
}
