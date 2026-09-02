"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getManageablePractitioners } from "@/lib/agenda-data";
import { sendEmail, sendSms } from "@/lib/notifications";

async function assertManageableEntry(entryId: string) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const entry = await prisma.listeAttente.findUniqueOrThrow({
    where: { id: entryId },
    include: { patient: true, practitioner: { include: { user: true } }, motif: true },
  });
  const manageable = await getManageablePractitioners(user);
  if (!manageable.some((p) => p.id === entry.practitionerId)) {
    throw new Error("Vous ne gérez pas ce praticien.");
  }
  return entry;
}

export async function withdrawWaitlistStaffAction(entryId: string) {
  await assertManageableEntry(entryId);
  await prisma.listeAttente.update({ where: { id: entryId }, data: { statut: "ANNULE" } });
  revalidatePath("/liste-attente");
}

export async function notifyWaitlistEntryNowAction(entryId: string) {
  const entry = await assertManageableEntry(entryId);
  const practitionerName = `${entry.practitioner.user.firstName} ${entry.practitioner.user.lastName}`;
  const message = `Une place est disponible chez ${practitionerName} pour "${entry.motif.name}". Contactez le cabinet ou réservez en ligne dès que possible.`;

  if (entry.patient.phone) await sendSms(entry.patient.phone, message);
  if (entry.patient.email) await sendEmail(entry.patient.email, "Une place est disponible", message);

  await prisma.listeAttente.update({ where: { id: entryId }, data: { statut: "NOTIFIE" } });
  revalidatePath("/liste-attente");
}
