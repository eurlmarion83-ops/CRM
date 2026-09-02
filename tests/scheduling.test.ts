import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { addDays, addMinutes, nextMonday, setHours, setMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots, bookAppointment } from "@/lib/scheduling";

/**
 * Tests d'intégration contre une vraie base Postgres (celle de DATABASE_URL) — pas de mock du
 * client Prisma, dont la surface (requêtes imbriquées, transactions) rendrait le mock plus
 * fragile que la valeur qu'il apporterait. Toutes les données créées ici sont préfixées
 * "TEST_" et supprimées dans afterAll, pour ne pas polluer les données de démonstration.
 */

let practitionerId: string;
let motifPublicId: string;
let motifInternalId: string;
let patientId: string;
let establishmentId: string;

function nextMondayAt(hour: number, minute = 0) {
  return setMinutes(setHours(nextMonday(new Date()), hour), minute);
}

beforeAll(async () => {
  const establishment = await prisma.establishment.create({
    data: { name: "TEST_Cabinet", address: "1 rue du test", city: "Testville" },
  });
  establishmentId = establishment.id;

  const user = await prisma.user.create({
    data: {
      email: `test-scheduling-${Date.now()}@example.com`,
      passwordHash: "x",
      role: "PRACTITIONER",
      firstName: "TEST_Prénom",
      lastName: "TEST_Nom",
    },
  });

  const practitioner = await prisma.practitioner.create({
    data: { userId: user.id, establishmentId: establishment.id, specialty: "TEST", cancellationDeadlineH: 24 },
  });
  practitionerId = practitioner.id;

  const motifPublic = await prisma.motif.create({
    data: { practitionerId: practitioner.id, name: "TEST_Public", durationMin: 30, onlineBookable: true, active: true },
  });
  motifPublicId = motifPublic.id;

  const motifInternal = await prisma.motif.create({
    data: { practitionerId: practitioner.id, name: "TEST_Interne", durationMin: 30, onlineBookable: false, active: true },
  });
  motifInternalId = motifInternal.id;

  // Lundi 9h-12h, visible publiquement, granularité 30 min.
  const monday = nextMondayAt(0, 0).getDay();
  await prisma.availability.create({
    data: { practitionerId: practitioner.id, dayOfWeek: monday, startTime: "09:00", endTime: "12:00", slotDurationMin: 30, visibility: "PUBLIC" },
  });

  const patient = await prisma.patient.create({ data: { firstName: "TEST_Patient", lastName: "TEST_Nom" } });
  patientId = patient.id;
});

afterAll(async () => {
  await prisma.rendezVous.deleteMany({ where: { practitionerId } });
  await prisma.motif.deleteMany({ where: { practitionerId } });
  await prisma.availability.deleteMany({ where: { practitionerId } });
  await prisma.patient.delete({ where: { id: patientId } });
  const practitioner = await prisma.practitioner.findUnique({ where: { id: practitionerId } });
  await prisma.practitioner.delete({ where: { id: practitionerId } });
  if (practitioner) await prisma.user.delete({ where: { id: practitioner.userId } });
  await prisma.establishment.delete({ where: { id: establishmentId } });
});

describe("getAvailableSlots", () => {
  it("returns slots within the public availability window", async () => {
    const from = nextMondayAt(0, 0);
    const to = addDays(from, 1);
    const slots = await getAvailableSlots(practitionerId, motifPublicId, { from, to, patientView: true });

    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(slot.start.getHours()).toBeGreaterThanOrEqual(9);
      expect(slot.end.getHours()).toBeLessThanOrEqual(12);
    }
  });

  it("excludes a motif that is not onlineBookable from patient-facing search", async () => {
    const from = nextMondayAt(0, 0);
    const to = addDays(from, 1);
    const slots = await getAvailableSlots(practitionerId, motifInternalId, { from, to, patientView: true });
    expect(slots).toHaveLength(0);
  });

  it("excludes a slot already covered by a confirmed appointment", async () => {
    const from = nextMondayAt(0, 0);
    const to = addDays(from, 1);
    const start = nextMondayAt(9, 0);

    const appointment = await bookAppointment({
      practitionerId,
      patientId,
      motifId: motifPublicId,
      start,
      end: addMinutes(start, 30),
    });

    const slots = await getAvailableSlots(practitionerId, motifPublicId, { from, to, patientView: true });
    expect(slots.some((s) => s.start.getTime() === start.getTime())).toBe(false);

    await prisma.rendezVous.delete({ where: { id: appointment.id } });
  });
});

describe("bookAppointment", () => {
  it("rejects a second booking that overlaps an existing confirmed appointment", async () => {
    const start = nextMondayAt(10, 0);
    const appointment = await bookAppointment({
      practitionerId,
      patientId,
      motifId: motifPublicId,
      start,
      end: addMinutes(start, 30),
    });

    await expect(
      bookAppointment({
        practitionerId,
        patientId,
        motifId: motifPublicId,
        start: addMinutes(start, 15), // chevauche le premier RDV
        end: addMinutes(start, 45),
      })
    ).rejects.toThrow("SLOT_ALREADY_BOOKED");

    await prisma.rendezVous.delete({ where: { id: appointment.id } });
  });
});
