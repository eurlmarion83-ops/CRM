import "dotenv/config";
import { runReminderSweep } from "../src/lib/reminders";

runReminderSweep()
  .then((sent) => {
    console.log(`Rappels envoyés pour ${sent.length} rendez-vous.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Erreur lors de l'envoi des rappels :", err);
    process.exit(1);
  });
