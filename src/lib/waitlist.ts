import { prisma } from "@/lib/prisma";
import { sendEmail, sendSms } from "@/lib/notifications";

// Nombre maximal de patients en liste d'attente notifiés pour un même créneau libéré
// (évite de spammer toute la file si elle est longue ; les premiers inscrits sont prioritaires).
const MAX_NOTIFIED_PER_SLOT = 3;

/**
 * À appeler après l'annulation d'un rendez-vous à venir : notifie les patients en liste
 * d'attente (statut ACTIVE) dont la préférence de créneau couvre l'horaire libéré, par ordre
 * d'inscription. Ne réserve rien automatiquement — le patient doit reprendre RDV lui-même.
 */
export async function notifyWaitlistForFreedSlot(practitionerId: string, motifId: string, freedStart: Date) {
  const candidates = await prisma.listeAttente.findMany({
    where: {
      practitionerId,
      motifId,
      statut: "ACTIVE",
      AND: [
        { OR: [{ preferredFrom: null }, { preferredFrom: { lte: freedStart } }] },
        { OR: [{ preferredTo: null }, { preferredTo: { gte: freedStart } }] },
      ],
    },
    include: { patient: true, practitioner: { include: { user: true } } },
    orderBy: { createdAt: "asc" },
    take: MAX_NOTIFIED_PER_SLOT,
  });

  for (const entry of candidates) {
    const practitionerName = `${entry.practitioner.user.firstName} ${entry.practitioner.user.lastName}`;
    const dateStr = freedStart.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const timeStr = freedStart.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const message = `Une place s'est libérée chez ${practitionerName} le ${dateStr} à ${timeStr}. Réservez vite en ligne, ce créneau peut repartir rapidement.`;

    if (entry.patient.phone) await sendSms(entry.patient.phone, message);
    if (entry.patient.email) {
      await sendEmail(entry.patient.email, "Une place s'est libérée", message);
    }

    await prisma.listeAttente.update({ where: { id: entry.id }, data: { statut: "NOTIFIE" } });
  }
}
