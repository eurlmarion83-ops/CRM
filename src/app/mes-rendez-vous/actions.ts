"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function withdrawWaitlistAction(entryId: string) {
  const user = await requireUser(["PATIENT"]);
  const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
  if (!patient) throw new Error("Patient introuvable.");

  const entry = await prisma.listeAttente.findUnique({ where: { id: entryId } });
  if (!entry || entry.patientId !== patient.id) {
    throw new Error("Cette inscription en liste d'attente ne vous appartient pas.");
  }

  await prisma.listeAttente.update({ where: { id: entryId }, data: { statut: "ANNULE" } });
  revalidatePath("/mes-rendez-vous");
}
