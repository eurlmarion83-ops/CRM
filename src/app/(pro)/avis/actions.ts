"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getManageablePractitioners } from "@/lib/agenda-data";

export async function toggleAvisPublieAction(avisId: string) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const avis = await prisma.avis.findUniqueOrThrow({ where: { id: avisId } });

  const manageable = await getManageablePractitioners(user);
  if (!manageable.some((p) => p.id === avis.practitionerId)) {
    throw new Error("Vous ne pouvez pas modérer cet avis.");
  }

  await prisma.avis.update({ where: { id: avisId }, data: { publie: !avis.publie } });
  revalidatePath("/avis");
}
