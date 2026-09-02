"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function createTacheAction(formData: FormData) {
  await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const echeance = String(formData.get("echeance") ?? "");
  await prisma.tache.create({
    data: {
      titre: String(formData.get("titre") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      priorite: String(formData.get("priorite") ?? "NORMALE"),
      assigneId: String(formData.get("assigneId") ?? "") || null,
      echeance: echeance ? new Date(echeance) : null,
    },
  });
  revalidatePath("/taches");
}

export async function updateTacheStatutAction(tacheId: string, statut: string) {
  await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  await prisma.tache.update({ where: { id: tacheId }, data: { statut } });
  revalidatePath("/taches");
}

export async function deleteTacheAction(tacheId: string) {
  await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  await prisma.tache.delete({ where: { id: tacheId } });
  revalidatePath("/taches");
}
