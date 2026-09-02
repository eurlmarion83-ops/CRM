"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getManageablePractitioners } from "@/lib/agenda-data";

export type DocumentActionState = { error?: string } | undefined;

export async function createDocumentAction(_prev: DocumentActionState, formData: FormData): Promise<DocumentActionState> {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const patientId = String(formData.get("patientId") ?? "");
  const practitionerId = String(formData.get("practitionerId") ?? "");
  const type = String(formData.get("type") ?? "ORDONNANCE");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!patientId || !practitionerId || !content) {
    return { error: "Praticien, patient et contenu sont obligatoires." };
  }

  const manageable = await getManageablePractitioners(user);
  if (!manageable.some((p) => p.id === practitionerId)) {
    return { error: "Vous ne pouvez pas créer de document pour ce praticien." };
  }

  await prisma.documentMedical.create({
    data: {
      patientId,
      practitionerId,
      authorId: user.id,
      type,
      title: title || type,
      content,
    },
  });

  await prisma.journalActivite.create({
    data: { userId: user.id, action: "DOCUMENT_CREE", entityType: "Patient", entityId: patientId },
  });

  revalidatePath(`/patients/${patientId}`);
  return undefined;
}

export type MergeState = { error?: string } | undefined;

/**
 * Fusionne `duplicateId` dans `patientId` : réattribue tous les RDV/conversations/documents du
 * doublon vers la fiche conservée, puis supprime le doublon.
 */
export async function mergePatientsAction(_prev: MergeState, formData: FormData): Promise<MergeState> {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const patientId = String(formData.get("patientId") ?? "");
  const duplicateId = String(formData.get("duplicateId") ?? "");

  if (!patientId || !duplicateId || patientId === duplicateId) {
    return { error: "Sélectionnez un patient différent à fusionner." };
  }

  const [target, duplicate] = await Promise.all([
    prisma.patient.findUnique({ where: { id: patientId } }),
    prisma.patient.findUnique({ where: { id: duplicateId } }),
  ]);
  if (!target || !duplicate) return { error: "Patient introuvable." };

  await prisma.$transaction([
    prisma.rendezVous.updateMany({ where: { patientId: duplicateId }, data: { patientId } }),
    prisma.documentMedical.updateMany({ where: { patientId: duplicateId }, data: { patientId } }),
    prisma.conversationPatient.updateMany({ where: { patientId: duplicateId }, data: { patientId } }),
    prisma.patient.update({
      where: { id: patientId },
      data: {
        email: target.email ?? duplicate.email,
        phone: target.phone ?? duplicate.phone,
        address: target.address ?? duplicate.address,
        city: target.city ?? duplicate.city,
        birthDate: target.birthDate ?? duplicate.birthDate,
        notes: [target.notes, duplicate.notes].filter(Boolean).join("\n") || null,
      },
    }),
    prisma.patient.delete({ where: { id: duplicateId } }),
  ]);

  await prisma.journalActivite.create({
    data: { userId: user.id, action: "PATIENTS_FUSIONNES", entityType: "Patient", entityId: patientId, metadata: JSON.stringify({ duplicateId }) },
  });

  redirect(`/patients/${patientId}`);
}
