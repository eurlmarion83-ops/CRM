import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { getVisiblePractitioners, isPatientInScope } from "@/lib/agenda-data";

/**
 * Régression pour une fuite multi-tenant trouvée manuellement : un ADMIN voyait tous les
 * praticiens/patients de tous les cabinets, pas seulement le sien. Ce test crée deux
 * établissements indépendants ("cabinets") et vérifie qu'ils sont bien étanches l'un à l'autre.
 */

let cabinetA: { establishmentId: string; adminId: string; practitionerId: string; patientId: string };
let cabinetB: { establishmentId: string; adminId: string; practitionerId: string; patientId: string };

async function createCabinet(label: string) {
  const establishment = await prisma.establishment.create({
    data: { name: `TEST_Cabinet_${label}`, address: "1 rue du test", city: "Testville" },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: `test-tenancy-admin-${label}-${Date.now()}@example.com`,
      passwordHash: "x",
      role: "ADMIN",
      firstName: "TEST_Admin",
      lastName: label,
      establishmentId: establishment.id,
    },
  });

  const practitionerUser = await prisma.user.create({
    data: {
      email: `test-tenancy-practitioner-${label}-${Date.now()}@example.com`,
      passwordHash: "x",
      role: "PRACTITIONER",
      firstName: "TEST_Docteur",
      lastName: label,
    },
  });
  const practitioner = await prisma.practitioner.create({
    data: { userId: practitionerUser.id, establishmentId: establishment.id, specialty: "TEST" },
  });

  const patient = await prisma.patient.create({
    data: { firstName: "TEST_Patient", lastName: label, establishmentId: establishment.id },
  });

  return { establishmentId: establishment.id, adminId: adminUser.id, practitionerId: practitioner.id, patientId: patient.id };
}

async function cleanupCabinet(c: { establishmentId: string; adminId: string; practitionerId: string; patientId: string }) {
  const practitioner = await prisma.practitioner.findUnique({ where: { id: c.practitionerId } });
  await prisma.patient.delete({ where: { id: c.patientId } });
  await prisma.practitioner.delete({ where: { id: c.practitionerId } });
  if (practitioner) await prisma.user.delete({ where: { id: practitioner.userId } });
  await prisma.user.delete({ where: { id: c.adminId } });
  await prisma.establishment.delete({ where: { id: c.establishmentId } });
}

beforeAll(async () => {
  cabinetA = await createCabinet("A");
  cabinetB = await createCabinet("B");
});

afterAll(async () => {
  await cleanupCabinet(cabinetA);
  await cleanupCabinet(cabinetB);
});

describe("multi-tenant isolation", () => {
  it("an admin only sees practitioners from their own establishment", async () => {
    const visibleToA = await getVisiblePractitioners({ id: cabinetA.adminId, role: "ADMIN" });
    const visibleIds = visibleToA.map((p) => p.id);

    expect(visibleIds).toContain(cabinetA.practitionerId);
    expect(visibleIds).not.toContain(cabinetB.practitionerId);
  });

  it("an admin without establishmentId sees nothing (fails closed, not open)", async () => {
    const orphanAdmin = await prisma.user.create({
      data: {
        email: `test-tenancy-orphan-${Date.now()}@example.com`,
        passwordHash: "x",
        role: "ADMIN",
        firstName: "TEST_Orphan",
        lastName: "Admin",
      },
    });

    const visible = await getVisiblePractitioners({ id: orphanAdmin.id, role: "ADMIN" });
    expect(visible).toHaveLength(0);

    await prisma.user.delete({ where: { id: orphanAdmin.id } });
  });

  it("a patient from another establishment is out of scope", async () => {
    const inScope = await isPatientInScope(cabinetA.patientId, { id: cabinetA.adminId, role: "ADMIN" });
    const outOfScope = await isPatientInScope(cabinetB.patientId, { id: cabinetA.adminId, role: "ADMIN" });

    expect(inScope).toBe(true);
    expect(outOfScope).toBe(false);
  });
});
