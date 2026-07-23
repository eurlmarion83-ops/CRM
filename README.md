# MedCRM — Plateforme de rendez-vous médical, téléconsultation & CRM

MVP du **Bloc 1** du cahier des charges : prise de rendez-vous en ligne (patient +
praticien/secrétariat), téléconsultation vidéo intégrée, rappels SMS/e-mail, et tableau de
bord d'accueil. L'architecture (modèle de données, structure du projet) est conçue pour
recevoir les Blocs 2 à 5 (CRM commercial, télé-secrétariat/messagerie, dossier patient,
logiciel de gestion de cabinet réglementé) en modules successifs.

## Sommaire

- [Stack technique et choix](#stack-technique-et-choix)
- [Démarrage rapide](#démarrage-rapide)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Fonctionnalités livrées (Bloc 1)](#fonctionnalités-livrées-bloc-1)
- [Simplifications assumées du MVP](#simplifications-assumées-du-mvp)
- [Architecture & roadmap Blocs 2-5](#architecture--roadmap-blocs-2-5)
- [Conformité santé — points à trancher avant mise en production](#conformité-santé--points-à-trancher-avant-mise-en-production)
- [Déploiement](#déploiement)

## Stack technique et choix

| Domaine | Choix | Pourquoi / alternative |
|---|---|---|
| Framework | **Next.js 16** (App Router, React 19, Server Actions, Turbopack) | Un seul framework full-stack (UI + API + rendu serveur), déploiement simple, écosystème mature. |
| Langage | TypeScript strict | Sécurité de type de bout en bout, y compris sur le schéma de données via Prisma. |
| Base de données | **SQLite** en dev/démo via Prisma + driver adapter `@prisma/adapter-better-sqlite3` | Zéro configuration pour tester le MVP immédiatement. **En production, migrer vers PostgreSQL** (Prisma le supporte nativement ; remplacer l'adapter par `@prisma/adapter-pg` et ajuster `DATABASE_URL`). Les "enums" du modèle sont volontairement des `String` contraints côté application (`src/lib/enums.ts`) car SQLite ne supporte pas les enums natifs Prisma — ce choix reste compatible avec Postgres. |
| ORM | Prisma 7 (nouvelle API "driver adapters" et générateur `prisma-client`) | Migrations versionnées, typage généré, requêtes lisibles. |
| Auth | NextAuth v5 (Credentials + JWT), rôles Patient/Praticien/Secrétaire/Admin | Un seul système d'auth pour les 4 rôles ; mots de passe hashés (bcrypt). Patients peuvent aussi réserver **sans compte** (invité) via un lien signé (HMAC) propre à chaque RDV. |
| Style | Tailwind CSS v4 | Rapide à itérer, cohérent, sans dépendance CSS-in-JS. |
| Téléconsultation | **Jitsi Meet** (External API, embarqué en iframe, WebRTC natif) | Aucune installation côté patient, salle d'attente approximée par la fonctionnalité "Lobby" de Jitsi. ⚠️ `meet.jit.si` (serveur public) est utilisé **uniquement pour la démo** et n'est pas hébergé en France ni certifié HDS : **ne jamais y faire transiter de vraies données de santé**. En production : Jitsi auto-hébergé chez un hébergeur certifié HDS, ou service contractualisé HDS (LiveKit Cloud EU, Daily, Twilio Video…). Voir `src/app/consultation/[room]/jitsi-room.tsx`. |
| SMS / Email | Abstraction fournisseur (`src/lib/notifications.ts`) : mock console par défaut, adaptateurs **Twilio** (SMS) et **Resend** (email) prêts, activés dès que les clés API sont renseignées dans `.env`. | Pas de blocage pour tester le MVP sans compte payant ; bascule en un fichier `.env` pour la prod. |
| Rappels | `src/lib/reminders.ts` + route `/api/cron/reminders` (protégée par `CRON_SECRET`) + script `npm run reminders` | Compatible Vercel Cron, cron système, ou tâche planifiée CI. |
| Calendrier patient | Génération `.ics` (paquet `ics`) | Ajout direct à Google/Apple/Outlook Calendar sans dépendance externe. |

## Démarrage rapide

Prérequis : Node.js ≥ 20.9.

```bash
npm install                # installe les dépendances + génère le client Prisma (postinstall)
cp .env.example .env       # puis générez un secret : openssl rand -base64 32 → AUTH_SECRET
npm run db:migrate         # crée la base SQLite locale (prisma/migrations)
npm run db:seed            # jeu de données de démonstration (praticiens, patients, RDV, devis)
npm run dev                # http://localhost:3000
```

Pour tester les rappels automatiques manuellement : `npm run reminders`.

## Comptes de démonstration

Mot de passe commun : `Demo1234!` (défini dans `prisma/seed.ts`).

| Rôle | Email |
|---|---|
| Praticienne (médecine générale) | `dr.martin@medcrm-demo.fr` |
| Praticienne (gynécologie) | `dr.benali@medcrm-demo.fr` |
| Praticien (dermatologie) | `dr.lefevre@medcrm-demo.fr` |
| Secrétaire (gère les 3 praticiens) | `secretariat@medcrm-demo.fr` |
| Administrateur | `admin@medcrm-demo.fr` |

Côté patient : créez un compte via `/inscription`, ou réservez directement en invité depuis
`/recherche` → fiche praticien (aucun compte requis).

## Fonctionnalités livrées (Bloc 1)

**Côté patient** (`/recherche`, `/praticien/[id]`, `/mes-rendez-vous`, `/confirmation/[id]`)
- Recherche par spécialité / nom / ville, fiche praticien (tarifs, adresse, moyens de paiement).
- Réservation en ligne : choix du motif → créneaux disponibles en temps réel → coordonnées →
  confirmation immédiate, en 3 étapes.
- Réservation possible sans compte (invité) via lien sécurisé, ou avec compte patient.
- Ajout au calendrier (`.ics`), annulation en ligne dans le délai paramétré par le praticien
  (`cancellationDeadlineH`).
- Salle d'attente vidéo accessible 10 min avant l'heure du RDV pour les motifs "téléconsultation".

**Côté praticien / secrétariat / admin** (`/tableau-de-bord`, `/agenda`, `/motifs`,
`/disponibilites`, `/patients`)
- Agenda partagé multi-praticiens : vues **Liste / Jour / Semaine / Mois**, mini-calendrier,
  sélecteur d'agendas avec couleur par praticien, ligne d'heure courante, impression du planning
  (`window.print`, mise en page à adapter selon l'imprimante cible).
- Création de RDV par clic sur un créneau (recherche ou création de patient), report (nouvelle
  date/heure), annulation, marquage "no-show".
- **« Trouver un créneau »** : assistant multi-critères (praticien(s), type de consultation,
  jours/horaires acceptés) → liste des prochains créneaux libres, y compris tous-praticiens-confondus.
- **Motifs de consultation** personnalisables par praticien : couleur, durée, type
  (cabinet / domicile / vidéo), réservable en ligne ou usage interne uniquement (masqué côté
  patient par défaut), duplication vers un confrère.
- **Disponibilités** : plages hebdomadaires récurrentes avec granularité de créneau, visibilité
  publique ou interne (secrétariat/téléphone uniquement), restriction à certains motifs, congés.
- Téléconsultation : le praticien active le "Lobby" Jitsi à l'entrée, admet le patient depuis la
  salle d'attente virtuelle ; micro/caméra, partage d'écran, chat intégrés (Jitsi).
- Rappels SMS/e-mail automatiques (confirmation, J-1, H-1, annulation), quota SMS/signatures
  visible sur le tableau de bord.
- Tableau de bord "Bonjour {prénom}" : RDV aujourd'hui/demain, quotas SMS/signatures, graphique
  CA mensuel, jauge d'objectif, aperçu des devis (CRM Bloc 2).

## Simplifications assumées du MVP

Documentées ici pour transparence — à traiter avant une mise en production réelle :

- **Fuseau horaire** : les horaires sont traités en heure serveur/navigateur, sans gestion
  explicite de fuseau (`Europe/Paris` implicite). À industrialiser avec `date-fns-tz`/Luxon et
  un fuseau par établissement si multi-régions.
- **Semaine multi-praticiens** : la vue Semaine se concentre sur un seul praticien à la fois
  (comparaison multi-praticiens disponible en vue Jour, colonnes côte à côte). La vue Mois agrège
  tous les praticiens sélectionnés.
- **Drag & drop** : le déplacement de RDV se fait via un formulaire (nouvelle date/heure) plutôt
  que par glisser-déposer visuel — même résultat fonctionnel, ergonomie à raffiner.
- **Impression du planning mensuel** : utilise l'impression navigateur (`window.print()`) plutôt
  qu'une génération PDF serveur dédiée.
- **Salle d'attente vidéo** : approximée par le "Lobby" Jitsi (premier arrivé = modérateur sans
  authentification). Fiable pour une démo, à sécuriser avec JaaS/JWT ou un self-host authentifié
  en production (voir tableau ci-dessus).
- **Dédoublonnage patients invités** : une réservation invité recherche un patient existant par
  email exact ; pas de fusion de doublons avancée (prévue en Bloc 4).

## Architecture & roadmap Blocs 2-5

Le schéma Prisma (`prisma/schema.prisma`) inclut déjà des modèles "stub" pour les blocs suivants,
afin que l'extension se fasse par ajout de code plutôt que par refonte :

- **Bloc 2 (CRM commercial)** : modèle `Devis` présent (aperçu affiché sur le tableau de bord) ;
  restent à livrer : factures, signature électronique, pipeline prospects, workflows de relance,
  tickets SAV.
- **Bloc 3 (télé-secrétariat & communication)** : modèles `Conversation` / `MessageInterne`
  (messagerie interne temps réel) et `ConversationPatient` (messagerie patient sécurisée) + `Tache`
  déjà dans le schéma ; l'implémentation temps réel nécessitera un canal WebSocket (Socket.IO,
  Ably, Pusher…) non inclus dans ce MVP HTTP/Server Actions.
- **Bloc 4 (dossier patient & documents)** : la fiche patient actuelle est minimale
  (coordonnées + historique RDV) ; restent à livrer génération de documents, paiement en ligne,
  export/portabilité RGPD.
- **Bloc 5 (LGC réglementé type Weda)** : **non démarré intentionnellement** — ce bloc déclenche
  des obligations réglementaires fortes (voir section suivante) à cadrer avec un juriste santé
  numérique avant tout développement.

## Conformité santé — points à trancher avant mise en production

⚠️ Ceci n'est pas un avis juridique. Le cadre français (ANS, CNIL, Assurance Maladie) évolue ;
faites valider par un DPO / avocat spécialisé santé numérique avant toute mise en production
avec de vraies données de santé.

- **Hébergement HDS** : ce projet n'est pas déployé chez un hébergeur certifié HDS. Choisir un
  hébergeur certifié pour toute donnée de santé réelle (base de données ET service de visio).
- **RGPD/CNIL** : pas d'AIPD/PIA réalisée, pas de registre des traitements ni de DPO désigné dans
  ce livrable — à faire avant toute donnée réelle. Le mot de passe est haché (bcrypt), les accès
  sont journalisés (`JournalActivite`), mais aucun chiffrement au repos n'est configuré sur la
  base SQLite de démo.
- **Téléconsultation** : `meet.jit.si` (démo) n'est pas conforme HDS — voir tableau stack ci-dessus.
- **Ségur du numérique en santé / PGSSI-S / Pro Santé Connect / INS / DMP / MSSanté** : non
  implémentés (hors périmètre Bloc 1-4).
- **Bloc 5 uniquement** : un logiciel de gestion de cabinet avec dossier médical + prescription +
  facturation Assurance Maladie nécessite l'agrément CNDA (SESAM-Vitale), la certification HAS du
  LAP, et potentiellement un marquage CE (dispositif médical). À ne pas développer sans
  accompagnement réglementaire dédié.
- **2FA** : non implémentée dans ce MVP (NextAuth Credentials simple) ; à ajouter pour les comptes
  professionnels avant mise en production (données de santé).

## Déploiement

Le projet est une application Next.js standard (compatible Vercel, ou tout hébergeur Node.js) :

```bash
npm run build
npm start
```

Points à adapter en production :
1. `DATABASE_URL` → PostgreSQL (remplacer l'adapter Prisma `better-sqlite3` par `@prisma/adapter-pg` ou
   équivalent, mettre à jour `src/lib/prisma.ts`).
2. Renseigner `TWILIO_*` et `RESEND_API_KEY` pour des envois SMS/e-mail réels.
3. Planifier `/api/cron/reminders` (Vercel Cron, cron système) toutes les 15-30 minutes, avec
   `CRON_SECRET` renseigné.
4. Remplacer `NEXT_PUBLIC_JITSI_DOMAIN` par une instance conforme HDS (voir section Conformité).
5. Générer un nouvel `AUTH_SECRET` en production (`openssl rand -base64 32`), ne jamais réutiliser
   celui de démo.
