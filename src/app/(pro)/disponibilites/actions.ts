"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getManageablePractitioners } from "@/lib/agenda-data";

async function assertManageable(practitionerId: string) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const manageable = await getManageablePractitioners(user);
  if (!manageable.some((p) => p.id === practitionerId)) {
    throw new Error("Vous ne pouvez pas gérer ce praticien.");
  }
}

export async function createAvailabilityAction(formData: FormData) {
  const practitionerId = String(formData.get("practitionerId") ?? "");
  await assertManageable(practitionerId);
  const motifIds = formData.getAll("motifIds").map(String);

  const availability = await prisma.availability.create({
    data: {
      practitionerId,
      dayOfWeek: Number(formData.get("dayOfWeek") ?? 1),
      startTime: String(formData.get("startTime") ?? "09:00"),
      endTime: String(formData.get("endTime") ?? "18:00"),
      slotDurationMin: Number(formData.get("slotDurationMin") ?? 15),
      visibility: String(formData.get("visibility") ?? "PUBLIC"),
    },
  });

  if (motifIds.length > 0) {
    await prisma.availabilityMotif.createMany({
      data: motifIds.map((motifId) => ({ availabilityId: availability.id, motifId })),
    });
  }

  revalidatePath("/disponibilites");
}

export async function deleteAvailabilityAction(formData: FormData) {
  const id = String(formData.get("availabilityId") ?? "");
  const availability = await prisma.availability.findUniqueOrThrow({ where: { id } });
  await assertManageable(availability.practitionerId);
  await prisma.availability.delete({ where: { id } });
  revalidatePath("/disponibilites");
}

export async function createTimeOffAction(formData: FormData) {
  const practitionerId = String(formData.get("practitionerId") ?? "");
  await assertManageable(practitionerId);
  await prisma.timeOff.create({
    data: {
      practitionerId,
      start: new Date(String(formData.get("start"))),
      end: new Date(String(formData.get("end"))),
      reason: String(formData.get("reason") ?? ""),
    },
  });
  revalidatePath("/disponibilites");
}

export async function deleteTimeOffAction(formData: FormData) {
  const id = String(formData.get("timeOffId") ?? "");
  const timeOff = await prisma.timeOff.findUniqueOrThrow({ where: { id } });
  await assertManageable(timeOff.practitionerId);
  await prisma.timeOff.delete({ where: { id } });
  revalidatePath("/disponibilites");
}
