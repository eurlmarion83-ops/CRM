import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { seedDemoData, DEMO_ACCOUNTS, DEMO_PASSWORD } from "../src/lib/seed-demo";

async function main() {
  console.log("Réinitialisation des données de démonstration...");
  await seedDemoData();

  console.log("\nDonnées de démonstration créées avec succès.\n");
  console.log("Comptes de démonstration (mot de passe commun : %s) :", DEMO_PASSWORD);
  for (const account of DEMO_ACCOUNTS) {
    console.log(`  ${account.role} : ${account.email}`);
  }
  console.log("  (Patients : créez un compte via /inscription ou réservez en invité sur /recherche)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
