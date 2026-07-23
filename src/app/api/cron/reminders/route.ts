import { NextRequest, NextResponse } from "next/server";
import { runReminderSweep } from "@/lib/reminders";

// Point d'entrée pour un cron externe (Vercel Cron, cron système, GitHub Actions scheduled...).
// Protégé par un secret partagé (CRON_SECRET) transmis en en-tête Authorization: Bearer <secret>.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }

  const sent = await runReminderSweep();
  return NextResponse.json({ sent: sent.length });
}
