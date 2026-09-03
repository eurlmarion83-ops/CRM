import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/enums";

export type StaffUser = { id: string; role: Role };

/** Praticiens visibles par un membre du personnel (agenda partagé multi-praticiens). */
export async function getVisiblePractitioners(user: StaffUser) {
  if (user.role === "ADMIN") {
    // ⚠️ Isolation multi-tenant : un admin ne doit voir que son propre établissement, jamais
    // les praticiens d'un autre cabinet inscrit sur la plateforme. Sans establishmentId
    // configuré (compte orphelin), on renvoie volontairement une liste vide plutôt que de
    // fuiter les données de tous les cabinets par défaut.
    const admin = await prisma.user.findUnique({ where: { id: user.id }, select: { establishmentId: true } });
    if (!admin?.establishmentId) return [];
    return prisma.practitioner.findMany({
      where: { establishmentId: admin.establishmentId },
      include: { user: true },
      orderBy: { user: { lastName: "asc" } },
    });
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

/**
 * Établissement "courant" d'un membre du personnel — sert à rattacher les nouveaux patients
 * créés (booking ou saisie manuelle) au bon cabinet pour l'isolation multi-tenant. Une
 * secrétaire assignée à des praticiens de plusieurs cabinets renvoie le premier trouvé (limite
 * connue : pas de sélecteur de cabinet actif pour ce cas, cf. README).
 */
export async function getCurrentEstablishmentId(user: StaffUser): Promise<string | null> {
  if (user.role === "ADMIN") {
    const admin = await prisma.user.findUnique({ where: { id: user.id }, select: { establishmentId: true } });
    return admin?.establishmentId ?? null;
  }
  const practitioners = await getVisiblePractitioners(user);
  return practitioners[0]?.establishmentId ?? null;
}

/** Vrai si ce patient appartient au cabinet de l'utilisateur (isolation multi-tenant). */
export async function isPatientInScope(patientId: string, user: StaffUser): Promise<boolean> {
  const [establishmentId, visiblePractitioners] = await Promise.all([
    getCurrentEstablishmentId(user),
    getVisiblePractitioners(user),
  ]);
  const practitionerIds = visiblePractitioners.map((p) => p.id);

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { establishmentId: true, appointments: { where: { practitionerId: { in: practitionerIds } }, select: { id: true }, take: 1 } },
  });
  if (!patient) return false;
  return (establishmentId != null && patient.establishmentId === establishmentId) || patient.appointments.length > 0;
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

/** Congés / absences ponctuelles à afficher en grisé dans l'agenda (façon "Absence" Doctolib). */
export async function getAgendaTimeOffs(practitionerIds: string[], from: Date, to: Date) {
  if (practitionerIds.length === 0) return [];
  return prisma.timeOff.findMany({
    where: {
      practitionerId: { in: practitionerIds },
      start: { lt: to },
      end: { gt: from },
    },
    orderBy: { start: "asc" },
  });
}
