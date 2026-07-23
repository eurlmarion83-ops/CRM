import { addHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import { notifyAppointment } from "@/lib/notifications";

/**
 * Envoie les rappels J-1 et H-1 pour les RDV confirmés qui n'ont pas encore reçu ce rappel.
 * Conçu pour être appelé par une tâche planifiée (cron) toutes les 15-30 minutes — voir
 * README §Rappels pour le déploiement (Vercel Cron / cron système + `npm run reminders`).
 */
export async function runReminderSweep(now: Date = new Date()) {
  const sent: string[] = [];

  await sendWindow(now, 24, "REMINDER_J1", sent);
  await sendWindow(now, 1, "REMINDER_H1", sent);

  return sent;
}

async function sendWindow(now: Date, hoursBefore: number, kind: "REMINDER_J1" | "REMINDER_H1", sent: string[]) {
  const windowStart = addHours(now, hoursBefore);
  const windowEnd = addHours(now, hoursBefore + 0.5); // fenêtre de 30 min pour un cron toutes les 30 min

  const appointments = await prisma.rendezVous.findMany({
    where: {
      status: "CONFIRMED",
      start: { gte: windowStart, lt: windowEnd },
      reminders: { none: { kind } },
    },
    include: { patient: true, practitioner: { include: { user: true } }, motif: true },
  });

  for (const appt of appointments) {
    await notifyAppointment({
      appointmentId: appt.id,
      kind,
      to: { phone: appt.patient.phone, email: appt.patient.email },
      smsBody: `Rappel : RDV ${appt.motif.name} le ${appt.start.toLocaleDateString("fr-FR")} à ${appt.start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} avec ${appt.practitioner.user.firstName} ${appt.practitioner.user.lastName}.`,
      emailSubject: "Rappel de votre rendez-vous",
      emailBody: `Rappel : votre rendez-vous ${appt.motif.name} est prévu le ${appt.start.toLocaleString("fr-FR")}.`,
      establishmentId: appt.establishmentId,
    });
    sent.push(appt.id);
  }
}
