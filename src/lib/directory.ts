import { prisma } from "@/lib/prisma";

/**
 * Recherche de praticiens : deux sources distinctes, jamais mélangées comme si elles étaient
 * équivalentes.
 *
 *  1. `LOCAL` — praticiens réellement inscrits sur la plateforme, avec agenda configuré :
 *     réservables en ligne (c'est ce qu'utilise déjà `/recherche`).
 *  2. `ANNUAIRE_SANTE` — annuaire national officiel (RPPS/ADELI, publié par l'Agence du
 *     Numérique en Santé via Annuaire Santé / esante.gouv.fr) : sert uniquement à *retrouver*
 *     un professionnel de santé (nom, adresse, téléphone), jamais à lui ouvrir un agenda en
 *     ligne qu'il n'a pas configuré lui-même.
 *
 * ⚠️ Volontairement non implémenté avec de fausses données : la France ne fournit pas de
 * fichier "tous les médecins" qu'on puisse copier dans une base de démo sans que ça devienne
 * un annuaire trompeur. Cette fonction retourne un tableau vide tant que ANNUAIRE_SANTE_API_KEY
 * n'est pas configurée — brancher ici un vrai appel à l'API Annuaire Santé (FHIR, voir
 * https://esante.gouv.fr/produits-services/annuaire-sante — vérifier le format exact et les
 * modalités d'inscription développeur au moment de l'implémentation, ce document datant d'avant
 * la vérification en ligne de cette intégration).
 */

export type DirectoryResult = {
  source: "LOCAL" | "ANNUAIRE_SANTE";
  bookableOnline: boolean;
  practitionerId?: string; // uniquement pour les résultats LOCAL
  firstName: string;
  lastName: string;
  specialty: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
};

export async function searchLocalPractitioners(query: { q?: string; city?: string }): Promise<DirectoryResult[]> {
  const practitioners = await prisma.practitioner.findMany({
    where: {
      acceptsOnlineBooking: true,
      ...(query.q
        ? {
            OR: [
              { specialty: { contains: query.q } },
              { user: { firstName: { contains: query.q } } },
              { user: { lastName: { contains: query.q } } },
            ],
          }
        : {}),
      ...(query.city ? { city: { contains: query.city } } : {}),
    },
    include: { user: true },
  });

  return practitioners.map((p) => ({
    source: "LOCAL" as const,
    bookableOnline: true,
    practitionerId: p.id,
    firstName: p.user.firstName,
    lastName: p.user.lastName,
    specialty: p.specialty,
    address: p.address,
    city: p.city,
  }));
}

export async function searchAnnuaireSante(query: { q?: string; city?: string }): Promise<DirectoryResult[]> {
  const apiKey = process.env.ANNUAIRE_SANTE_API_KEY;
  if (!apiKey) return [];

  // TODO (intégration réelle, non couverte par ce MVP) :
  //   - S'inscrire comme développeur sur esante.gouv.fr pour obtenir un accès à l'API
  //     Annuaire Santé (basée sur FHIR — Répertoire Partagé des Professionnels de Santé).
  //   - Appeler l'endpoint de recherche de praticiens avec `query.q` (nom/spécialité) et
  //     `query.city`, avec l'en-tête d'authentification requis par l'API.
  //   - Mapper la réponse FHIR (Practitioner/PractitionerRole/Organization) vers DirectoryResult,
  //     avec `bookableOnline: false` et `source: "ANNUAIRE_SANTE"` dans tous les cas : un
  //     praticien qui n'a pas configuré son agenda sur cette plateforme ne doit jamais
  //     apparaître comme réservable en ligne.
  //   - Mettre en cache les résultats (l'annuaire national ne change pas à chaque requête).
  console.warn(
    `ANNUAIRE_SANTE_API_KEY est configurée mais l'appel réel à l'API n'est pas encore implémenté (requête ignorée : ${JSON.stringify(query)}).`
  );
  return [];
}

export async function searchDirectory(query: { q?: string; city?: string }): Promise<{
  local: DirectoryResult[];
  external: DirectoryResult[];
}> {
  const [local, external] = await Promise.all([searchLocalPractitioners(query), searchAnnuaireSante(query)]);
  return { local, external };
}
