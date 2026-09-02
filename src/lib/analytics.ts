import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";

export type PractitionerPerformance = {
  practitionerId: string;
  name: string;
  color: string;
  fillRatePct: number;
  noShowRatePct: number;
  bookedMinutes: number;
  capacityMinutes: number;
  totalAppointments: number;
};

/**
 * Taux de remplissage et taux de no-show par praticien sur les `days` derniers jours.
 *
 * Approximation assumée (documentée) : la capacité est déduite des plages hebdomadaires
 * récurrentes (`Availability`) multipliées par le nombre de semaines de la période, sans
 * soustraire les congés ponctuels (`TimeOff`) — un praticien en congés une semaine affichera
 * donc un taux de remplissage légèrement sous-estimé plutôt que faussement bas pour une
 * mauvaise raison. Suffisant pour une tendance, pas pour une facturation.
 */
export async function getPractitionerPerformance(practitionerIds: string[], days = 30): Promise<PractitionerPerformance[]> {
  if (practitionerIds.length === 0) return [];

  const since = subDays(new Date(), days);

  const [practitioners, availabilities, appointments] = await Promise.all([
    prisma.practitioner.findMany({ where: { id: { in: practitionerIds } }, include: { user: true } }),
    prisma.availability.findMany({ where: { practitionerId: { in: practitionerIds } } }),
    prisma.rendezVous.findMany({
      where: { practitionerId: { in: practitionerIds }, start: { gte: since } },
    }),
  ]);

  const weeks = days / 7;

  return practitioners.map((p) => {
    const weeklyCapacityMinutes = availabilities
      .filter((a) => a.practitionerId === p.id)
      .reduce((sum, a) => {
        const [startH, startM] = a.startTime.split(":").map(Number);
        const [endH, endM] = a.endTime.split(":").map(Number);
        return sum + (endH * 60 + endM - (startH * 60 + startM));
      }, 0);
    const capacityMinutes = Math.round(weeklyCapacityMinutes * weeks);

    const own = appointments.filter((a) => a.practitionerId === p.id);
    const countedStatuses = own.filter((a) => a.status === "CONFIRMED" || a.status === "COMPLETED" || a.status === "NO_SHOW");
    const bookedMinutes = own
      .filter((a) => a.status === "CONFIRMED" || a.status === "COMPLETED")
      .reduce((sum, a) => sum + (a.end.getTime() - a.start.getTime()) / 60000, 0);
    const noShowCount = own.filter((a) => a.status === "NO_SHOW").length;

    return {
      practitionerId: p.id,
      name: `${p.user.firstName} ${p.user.lastName}`,
      color: p.color,
      fillRatePct: capacityMinutes > 0 ? Math.min(100, Math.round((bookedMinutes / capacityMinutes) * 100)) : 0,
      noShowRatePct: countedStatuses.length > 0 ? Math.round((noShowCount / countedStatuses.length) * 100) : 0,
      bookedMinutes: Math.round(bookedMinutes),
      capacityMinutes,
      totalAppointments: countedStatuses.length,
    };
  });
}
