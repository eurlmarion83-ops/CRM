import { differenceInDays } from "date-fns";
import { prisma } from "@/lib/prisma";

/** Tâche auto-générée quand un RDV est marqué "absent" (no-show) — cf. spec Bloc 3. */
export async function createNoShowTask(appointmentId: string) {
  const appointment = await prisma.rendezVous.findUnique({
    where: { id: appointmentId },
    include: { patient: true, practitioner: { include: { user: true } } },
  });
  if (!appointment) return;

  await prisma.tache.create({
    data: {
      titre: `Rappeler ${appointment.patient.firstName} ${appointment.patient.lastName} suite à une absence`,
      description: `RDV du ${appointment.start.toLocaleDateString("fr-FR")} avec ${appointment.practitioner.user.firstName} ${appointment.practitioner.user.lastName} non honoré.`,
      priorite: "NORMALE",
      appointmentId,
    },
  });
}

/**
 * Détecte les devis envoyés depuis plus de `staleDays` jours sans relance récente et crée une
 * tâche de relance (une seule par devis : on vérifie qu'aucune tâche ouverte ne le référence déjà
 * via son objet dans le titre — approche simple, suffisante pour ce MVP).
 */
export async function runStaleDevisTaskSweep(staleDays = 7) {
  const devisList = await prisma.devis.findMany({ where: { statut: "ENVOYE" } });
  let created = 0;

  for (const devis of devisList) {
    const referenceDate = devis.dateRelance ?? devis.dateCreation;
    if (differenceInDays(new Date(), referenceDate) < staleDays) continue;

    const titre = `Relancer le devis "${devis.objet}" (${devis.clientNom})`;
    const existing = await prisma.tache.findFirst({ where: { titre, statut: { not: "FAIT" } } });
    if (existing) continue;

    await prisma.tache.create({
      data: {
        titre,
        description: `Devis envoyé le ${devis.dateCreation.toLocaleDateString("fr-FR")}, sans réponse depuis ${staleDays} jours.`,
        priorite: "HAUTE",
      },
    });
    created++;
  }

  return created;
}
