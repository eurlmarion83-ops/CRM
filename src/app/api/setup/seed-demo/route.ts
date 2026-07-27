import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDemoData, DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/seed-demo";

/**
 * Route d'amorçage : permet de créer le jeu de données de démonstration sur une base
 * cloud (Vercel Postgres/Neon...) sans avoir besoin d'un accès local à la base — utile
 * pour un déploiement "tout cloud". Protégée par SEED_SECRET (variable d'environnement).
 *
 * ⚠️ Destructif : réinitialise toutes les données applicatives (RDV, patients, praticiens...).
 * Par sécurité, refuse de s'exécuter si des données existent déjà, sauf `?force=true`.
 *
 * Usage : visiter (dans un navigateur ou via curl)
 *   https://votre-app.vercel.app/api/setup/seed-demo?secret=VOTRE_SEED_SECRET
 */
export async function GET(req: NextRequest) {
  const secret = process.env.SEED_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SEED_SECRET n'est pas configuré côté serveur : ajoutez-le dans les variables d'environnement Vercel." },
      { status: 500 }
    );
  }

  const provided = req.nextUrl.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Secret invalide." }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get("force") === "true";
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && !force) {
    return NextResponse.json(
      {
        error: `${existingUsers} utilisateur(s) existent déjà dans cette base. Ajoutez &force=true à l'URL pour réinitialiser et re-générer les données de démonstration (⚠️ destructif : supprime tout).`,
      },
      { status: 409 }
    );
  }

  await seedDemoData();

  return NextResponse.json({
    success: true,
    message: "Données de démonstration créées avec succès.",
    password: DEMO_PASSWORD,
    accounts: DEMO_ACCOUNTS,
  });
}
