import { NextRequest, NextResponse } from "next/server";
import { runReminderSweep } from "@/lib/reminders";
import { runStaleDevisTaskSweep } from "@/lib/task-automation";

// Point d'entrée pour un cron externe (Vercel Cron, cron système, GitHub Actions scheduled...).
// Protégé par un secret partagé (CRON_SECRET) transmis en en-tête Authorization: Bearer <secret>.
// Regroupe les rappels RDV et les tâches de relance auto-générées dans le même cron pour
// rester dans une seule tâche planifiée (le plan Hobby de Vercel limite le nombre de crons).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }

  const [sent, tasksCreated] = await Promise.all([runReminderSweep(), runStaleDevisTaskSweep()]);
  return NextResponse.json({ remindersSent: sent.length, tasksCreated });
}
