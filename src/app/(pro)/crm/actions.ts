"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { sendEmail } from "@/lib/notifications";

export async function createDevisAction(formData: FormData) {
  await requireUser(["SECRETARY", "ADMIN"]);
  await prisma.devis.create({
    data: {
      clientNom: String(formData.get("clientNom") ?? "").trim(),
      contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
      objet: String(formData.get("objet") ?? "").trim(),
      montant: Number(formData.get("montant") ?? 0),
    },
  });
  revalidatePath("/crm");
}

const STATUT_ORDER = ["BROUILLON", "ENVOYE", "SIGNE", "EXPIRE"];

export async function moveDevisStatutAction(devisId: string, direction: 1 | -1) {
  await requireUser(["SECRETARY", "ADMIN"]);
  const devis = await prisma.devis.findUniqueOrThrow({ where: { id: devisId } });
  const currentIndex = STATUT_ORDER.indexOf(devis.statut);
  const nextIndex = Math.min(Math.max(currentIndex + direction, 0), STATUT_ORDER.length - 1);
  await prisma.devis.update({ where: { id: devisId }, data: { statut: STATUT_ORDER[nextIndex] } });
  revalidatePath("/crm");
}

export async function transformToFactureAction(devisId: string) {
  const user = await requireUser(["SECRETARY", "ADMIN"]);
  const devis = await prisma.devis.findUniqueOrThrow({ where: { id: devisId } });
  if (devis.statut !== "SIGNE") throw new Error("Seul un devis signé peut être transformé en facture.");

  const count = await prisma.facture.count();
  const numero = `F${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  await prisma.facture.create({
    data: {
      devisId,
      numero,
      clientNom: devis.clientNom,
      montant: devis.montant,
      dateEcheance: addDays(new Date(), 30),
    },
  });

  await prisma.journalActivite.create({
    data: { userId: user.id, action: "FACTURE_CREEE", entityType: "Devis", entityId: devisId },
  });

  revalidatePath("/crm");
}

export async function markFacturePaidAction(factureId: string) {
  await requireUser(["SECRETARY", "ADMIN"]);
  await prisma.facture.update({ where: { id: factureId }, data: { statut: "PAYEE" } });
  revalidatePath("/crm");
}

export async function sendRelanceAction(devisId: string) {
  const user = await requireUser(["SECRETARY", "ADMIN"]);
  const devis = await prisma.devis.findUniqueOrThrow({ where: { id: devisId } });

  const message = `Relance sur devis "${devis.objet}" (${devis.montant.toLocaleString("fr-FR")} €) — statut actuel : ${devis.statut}.`;

  if (devis.contactEmail) {
    await sendEmail(devis.contactEmail, `Relance — ${devis.objet}`, message);
  }

  await prisma.relance.create({ data: { devisId, message } });
  await prisma.devis.update({ where: { id: devisId }, data: { dateRelance: new Date() } });
  await prisma.journalActivite.create({
    data: { userId: user.id, action: "DEVIS_RELANCE", entityType: "Devis", entityId: devisId },
  });

  revalidatePath("/crm");
}
