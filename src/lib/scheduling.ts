import { prisma } from "@/lib/prisma";
import {
  addMinutes,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  startOfDay,
  addDays,
  max as dateMax,
} from "date-fns";

export type Slot = {
  start: Date;
  end: Date;
  practitionerId: string;
  motifId: string;
};

type RangeOpts = {
  from: Date;
  to: Date;
  /** Vue patient : n'expose que les plages publiques + motifs réservables en ligne. */
  patientView: boolean;
  /** Ignore ce RDV lors de la détection de chevauchement (utile pour un report). */
  excludeAppointmentId?: string;
};

function timeStringToDate(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return setMilliseconds(setSeconds(setMinutes(setHours(day, h), m), 0), 0);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return isBefore(aStart, bEnd) && isBefore(bStart, aEnd);
}

/**
 * Calcule les créneaux disponibles d'un praticien pour un motif donné, sur une plage de dates.
 */
export async function getAvailableSlots(
  practitionerId: string,
  motifId: string,
  { from, to, patientView, excludeAppointmentId }: RangeOpts
): Promise<Slot[]> {
  const motif = await prisma.motif.findUnique({ where: { id: motifId } });
  if (!motif || motif.practitionerId !== practitionerId) return [];
  if (patientView && (!motif.active || !motif.onlineBookable)) return [];

  const availabilities = await prisma.availability.findMany({
    where: {
      practitionerId,
      ...(patientView ? { visibility: "PUBLIC" } : {}),
    },
    include: { restrictedMotifs: true },
  });
  if (availabilities.length === 0) return [];

  const timeOffs = await prisma.timeOff.findMany({ where: { practitionerId, end: { gte: from }, start: { lte: to } } });

  const existing = await prisma.rendezVous.findMany({
    where: {
      practitionerId,
      status: "CONFIRMED",
      start: { lt: to },
      end: { gt: from },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
  });

  const now = new Date();
  const slots: Slot[] = [];
  const duration = motif.durationMin;

  for (let day = startOfDay(dateMax([from, now])); isBefore(day, to); day = addDays(day, 1)) {
    const dow = day.getDay();
    const dayAvailabilities = availabilities.filter((a) => a.dayOfWeek === dow);

    for (const availability of dayAvailabilities) {
      // Si la plage est restreinte à certains motifs, vérifier que celui demandé en fait partie.
      if (availability.restrictedMotifs.length > 0 && !availability.restrictedMotifs.some((r) => r.motifId === motifId)) {
        continue;
      }

      const windowStart = timeStringToDate(day, availability.startTime);
      const windowEnd = timeStringToDate(day, availability.endTime);
      const step = availability.slotDurationMin;

      for (let start = windowStart; isBefore(addMinutes(start, duration), addMinutes(windowEnd, 1)); start = addMinutes(start, step)) {
        const end = addMinutes(start, duration);
        if (isBefore(start, now) || isBefore(start, from) || isAfter(end, to)) continue;

        const blockedByTimeOff = timeOffs.some((t) => overlaps(start, end, t.start, t.end));
        if (blockedByTimeOff) continue;

        const blockedByAppointment = existing.some((rdv) => overlaps(start, end, rdv.start, rdv.end));
        if (blockedByAppointment) continue;

        slots.push({ start, end, practitionerId, motifId });
      }
    }
  }

  slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  return slots;
}

export type FindSlotCriteria = {
  practitionerIds: string[];
  motifType?: "CABINET" | "DOMICILE" | "VIDEO";
  from: Date;
  to: Date;
  allowedWeekdays?: number[]; // 0-6
  timeRange?: { start: string; end: string }; // "HH:mm"
  patientView: boolean;
  limit?: number;
};

/**
 * Assistant « Trouver un créneau » : cherche les prochains créneaux libres, tous motifs
 * compatibles confondus, pour un ou plusieurs praticiens (usage secrétariat / recherche patient).
 */
export async function findNextSlots(criteria: FindSlotCriteria): Promise<Array<Slot & { practitionerName: string; motifName: string }>> {
  const practitioners = await prisma.practitioner.findMany({
    where: { id: { in: criteria.practitionerIds } },
    include: { user: true, motifs: true },
  });

  const results: Array<Slot & { practitionerName: string; motifName: string }> = [];

  for (const practitioner of practitioners) {
    const motifs = practitioner.motifs.filter(
      (m) => m.active && (!criteria.motifType || m.type === criteria.motifType) && (!criteria.patientView || m.onlineBookable)
    );

    for (const motif of motifs) {
      const slots = await getAvailableSlots(practitioner.id, motif.id, {
        from: criteria.from,
        to: criteria.to,
        patientView: criteria.patientView,
      });

      for (const slot of slots) {
        if (criteria.allowedWeekdays && !criteria.allowedWeekdays.includes(slot.start.getDay())) continue;
        if (criteria.timeRange) {
          const hhmm = `${String(slot.start.getHours()).padStart(2, "0")}:${String(slot.start.getMinutes()).padStart(2, "0")}`;
          if (hhmm < criteria.timeRange.start || hhmm > criteria.timeRange.end) continue;
        }
        results.push({
          ...slot,
          practitionerName: `${practitioner.user.firstName} ${practitioner.user.lastName}`,
          motifName: motif.name,
        });
      }
    }
  }

  results.sort((a, b) => a.start.getTime() - b.start.getTime());
  return results.slice(0, criteria.limit ?? 50);
}

/**
 * Réserve un créneau de façon atomique : revérifie l'absence de chevauchement au moment
 * de l'écriture pour éviter les doubles réservations en cas de concurrence.
 */
export async function bookAppointment(params: {
  practitionerId: string;
  patientId: string;
  motifId: string;
  establishmentId?: string | null;
  start: Date;
  end: Date;
  createdById?: string;
  notes?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const conflict = await tx.rendezVous.findFirst({
      where: {
        practitionerId: params.practitionerId,
        status: "CONFIRMED",
        start: { lt: params.end },
        end: { gt: params.start },
      },
    });
    if (conflict) {
      throw new Error("SLOT_ALREADY_BOOKED");
    }

    const motif = await tx.motif.findUniqueOrThrow({ where: { id: params.motifId } });

    const appointment = await tx.rendezVous.create({
      data: {
        practitionerId: params.practitionerId,
        patientId: params.patientId,
        motifId: params.motifId,
        establishmentId: params.establishmentId ?? undefined,
        start: params.start,
        end: params.end,
        createdById: params.createdById,
        notes: params.notes,
      },
    });

    if (motif.type === "VIDEO") {
      await tx.teleconsultation.create({
        data: {
          appointmentId: appointment.id,
          roomName: `rdv-${appointment.id}`,
        },
      });
    }

    return appointment;
  });
}
