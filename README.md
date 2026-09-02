# MedCRM — Plateforme de rendez-vous médical, téléconsultation & CRM

Plateforme complète pour cabinets médicaux et télé-secrétariat : prise de rendez-vous en ligne,
téléconsultation vidéo, CRM commercial, messagerie interne et patient, tâches, documents
médicaux, paiement en ligne, 2FA. Couvre les Blocs 1 à 4 du cahier des charges avec des
fonctionnalités réellement implémentées (pas de simples stubs — voir le détail plus bas), plus des
extensions inspirées de Doctolib/Inozis : cabinets multi-tenant en self-service, avis patients,
liste d'attente, pipeline commercial CRM et pièces jointes (voir
[Extensions avancées](#extensions-avancées-au-delà-du-cahier-des-charges-initial)).
Le **Bloc 5** (logiciel de gestion de cabinet réglementé : DME, prescription, SESAM-Vitale)
reste volontairement non démarré : il déclenche des obligations réglementaires fortes (agrément
CNDA, certification HAS) à cadrer avec un juriste santé numérique avant tout développement.

## Sommaire

- [Stack technique et choix](#stack-technique-et-choix)
- [Démarrage rapide](#démarrage-rapide)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Fonctionnalités livrées (Bloc 1)](#fonctionnalités-livrées-bloc-1)
- [Extensions avancées (multi-cabinet, avis, liste d'attente...)](#extensions-avancées-au-delà-du-cahier-des-charges-initial)
- [Simplifications assumées du MVP](#simplifications-assumées-du-mvp)
- [Architecture & roadmap Blocs 2-5](#architecture--roadmap-blocs-2-5)
- [Conformité santé — points à trancher avant mise en production](#conformité-santé--points-à-trancher-avant-mise-en-production)
- [Déploiement](#déploiement)

## Stack technique et choix

| Domaine | Choix | Pourquoi / alternative |
|---|---|---|
| Framework | **Next.js 16** (App Router, React 19, Server Actions, Turbopack) | Un seul framework full-stack (UI + API + rendu serveur), déploiement simple, écosystème mature. |
| Langage | TypeScript strict | Sécurité de type de bout en bout, y compris sur le schéma de données via Prisma. |
| Base de données | **PostgreSQL** via Prisma + driver adapter `@prisma/adapter-pg` | Compatible Vercel Postgres/Neon, Supabase, RDS, ou toute instance Postgres classique — même base en dev et en prod (pas de dérive de schéma). En local, une instance Postgres est nécessaire (voir démarrage rapide). Les "enums" du modèle sont volontairement des `String` contraints côté application (`src/lib/enums.ts`) pour rester simples à faire évoluer sans migration Prisma dédiée. |
| ORM | Prisma 7 (nouvelle API "driver adapters" et générateur `prisma-client`) | Migrations versionnées, typage généré, requêtes lisibles. |
| Auth | NextAuth v5 (Credentials + JWT), rôles Patient/Praticien/Secrétaire/Admin | Un seul système d'auth pour les 4 rôles ; mots de passe hashés (bcrypt). Patients peuvent aussi réserver **sans compte** (invité) via un lien signé (HMAC) propre à chaque RDV. |
| Style | Tailwind CSS v4 | Rapide à itérer, cohérent, sans dépendance CSS-in-JS. |
| Téléconsultation | **Jitsi Meet** (External API, embarqué en iframe, WebRTC natif) | Aucune installation côté patient, salle d'attente approximée par la fonctionnalité "Lobby" de Jitsi. ⚠️ `meet.jit.si` (serveur public) est utilisé **uniquement pour la démo** et n'est pas hébergé en France ni certifié HDS : **ne jamais y faire transiter de vraies données de santé**. En production : Jitsi auto-hébergé chez un hébergeur certifié HDS, ou service contractualisé HDS (LiveKit Cloud EU, Daily, Twilio Video…). Voir `src/app/consultation/[room]/jitsi-room.tsx`. |
| SMS / Email | Abstraction fournisseur (`src/lib/notifications.ts`) : mock console par défaut, adaptateurs **Twilio** (SMS) et **Resend** (email) prêts, activés dès que les clés API sont renseignées dans `.env`. | Pas de blocage pour tester le MVP sans compte payant ; bascule en un fichier `.env` pour la prod. |
| Rappels | `src/lib/reminders.ts` + route `/api/cron/reminders` (protégée par `CRON_SECRET`) + script `npm run reminders` | Compatible Vercel Cron, cron système, ou tâche planifiée CI. Le même cron déclenche aussi `runStaleDevisTaskSweep()` (tâches de relance auto-générées). |
| Calendrier patient | Génération `.ics` (paquet `ics`) | Ajout direct à Google/Apple/Outlook Calendar sans dépendance externe. |
| Documents / factures | PDF générés à la volée (`pdf-lib`), pas de blob stocké | Le contenu structuré vit en base, le rendu PDF est recalculé à chaque téléchargement — compatible hébergement serverless sans stockage fichier persistant. |
| Paiement en ligne | Abstraction `src/lib/payments.ts` : mock (`/paiement/mock/[id]`) par défaut, Stripe Checkout réel si `STRIPE_SECRET_KEY` configurée | Même pattern que SMS/email : testable sans compte payant. |
| 2FA | TOTP standard (`otpauth` + QR via `qrcode`), compatible Google Authenticator/Authy | Pas de dépendance à un service tiers. |
| Messagerie interne/patient | Sondage (polling) toutes les 3s, pas de WebSocket | Les fonctions serverless Vercel ne tiennent pas de connexion persistante ; documenté comme choix MVP, Pusher/Ably en upgrade path si un vrai push est nécessaire. |
| Tests | Vitest, intégration contre une vraie base Postgres | Voir §Tests plus bas. |

## Démarrage rapide

Prérequis : Node.js ≥ 20.9, et une base **PostgreSQL** accessible.

```bash
# Option la plus rapide en local : Postgres via Docker
docker run --name medcrm-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=medcrm -p 5432:5432 -d postgres:16

npm install                # installe les dépendances + génère le client Prisma (postinstall)
cp .env.example .env       # ajuster DATABASE_URL si besoin, puis générer un secret :
                            # openssl rand -base64 32 → AUTH_SECRET
npm run db:migrate         # applique les migrations (prisma/migrations)
npm run db:seed            # jeu de données de démonstration (praticiens, patients, RDV, devis)
npm run dev                # http://localhost:3000
```

Pour tester les rappels automatiques manuellement : `npm run reminders`.

### Tests

`npm run test` (Vitest) : tests unitaires (jetons d'accès invité) et d'intégration (moteur de
créneaux — `src/lib/scheduling.ts`) exécutés contre une vraie base Postgres plutôt qu'un mock du
client Prisma (le comportement des requêtes imbriquées/transactions serait fastidieux et fragile
à mocker fidèlement). Les données de test sont préfixées `TEST_` et nettoyées après coup. La CI
GitHub Actions (`.github/workflows/ci.yml`) lance lint + build (qui applique les migrations) +
tests sur chaque push, avec un conteneur Postgres de service.

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

Un nouveau cabinet peut aussi créer lui-même son espace via `/inscription-cabinet` (auto-service,
sans intervention manuelle) : cela crée l'établissement, un compte administrateur, puis redirige
vers `/equipe` pour inviter praticiens et secrétaires (mots de passe temporaires générés,
affichés une seule fois).

## Fonctionnalités livrées

### Bloc 1 — Rendez-vous & téléconsultation

**Côté patient** (`/recherche`, `/praticien/[id]`, `/mes-rendez-vous`, `/confirmation/[id]`,
`/mes-messages`)
- Recherche par spécialité / nom / ville, fiche praticien (tarifs, adresse, moyens de paiement).
- Réservation en ligne : choix du motif → créneaux disponibles en temps réel → coordonnées →
  confirmation immédiate, en 3 étapes. Sans compte (invité, lien sécurisé) ou avec compte patient.
- Ajout au calendrier (`.ics`), annulation en ligne dans le délai paramétré par le praticien.
- Salle d'attente vidéo accessible 10 min avant l'heure du RDV pour les motifs "téléconsultation".
- Paiement en ligne de la téléconsultation quand le motif a un prix configuré.
- Messagerie sécurisée avec le cabinet ; export RGPD de ses propres données (`/mes-rendez-vous`).

**Côté praticien / secrétariat / admin** (`/tableau-de-bord`, `/agenda`, `/motifs`,
`/disponibilites`, `/patients`)
- Agenda partagé multi-praticiens : vues **Liste / Jour / Semaine / Mois** (la vue Semaine croise
  vraiment jour × praticien, pas un focus mono-praticien), mini-calendrier, sélecteur d'agendas
  coloré, ligne d'heure courante, **glisser-déposer** pour reprogrammer un RDV, impression du
  planning (`window.print`).
- **« Trouver un créneau »** : assistant multi-critères → liste des prochains créneaux libres,
  tous praticiens confondus.
- **Motifs** personnalisables par praticien : couleur, durée, type (cabinet/domicile/vidéo),
  réservable en ligne ou usage interne, prix optionnel, duplication vers un confrère.
- **Disponibilités** : plages hebdomadaires récurrentes, visibilité publique/interne, restriction
  par motif, congés.
- Téléconsultation : "Lobby" Jitsi comme salle d'attente virtuelle, micro/caméra/partage
  d'écran/chat intégrés.
- Rappels SMS/e-mail automatiques, quota SMS/signatures.
- Tableau de bord : RDV du jour/demain, CA mensuel, objectif, **taux de remplissage et de
  no-show par praticien**, aperçu CRM, messagerie patients en attente.

### Bloc 2 — CRM commercial (`/crm`)
- Pipeline de devis en colonnes (Brouillon → Envoyé → Signé → Expiré).
- Transformation d'un devis signé en facture (numérotée), export PDF de la facture.
- Relance manuelle (email + journalisation) et relance **automatique** : une tâche est créée
  quand un devis envoyé reste sans réponse au-delà d'un délai (via le cron des rappels).

### Bloc 3 — Télé-secrétariat & communication (`/taches`, `/messagerie`, `/messagerie-patients`)
- **Tâches** : création/assignation/échéance/priorité, vues "mes tâches"/"équipe", badge de
  compteur ; auto-générées sur no-show et devis non relancés.
- **Messagerie interne** (secrétaires ↔ praticiens) : conversations 1-1 et groupes.
- **Messagerie patients** : fil sécurisé par patient, assignation à un praticien, statut
  à traiter/traité.
- Les deux messageries utilisent un sondage (polling) 3s plutôt qu'un vrai push — voir tableau
  stack ci-dessus.

### Bloc 4 — Dossier patient & documents (`/patients/[id]`)
- Fiche patient : historique des RDV, documents, fusion de doublons.
- Génération de documents médicaux (ordonnance, certificat, compte rendu) en PDF à la demande.
- Paiement en ligne (voir Bloc 1) et export RGPD (portabilité des données patient).

### Extensions avancées (au-delà du cahier des charges initial)

Ajoutées pour rapprocher la plateforme de références comme Doctolib/Inozis, en gardant la même
rigueur (schéma migré, testé, vérifié fonctionnellement) :

- **Multi-cabinet en self-service** (`/inscription-cabinet`, `/equipe`) : un cabinet crée son
  espace seul (établissement + compte admin), puis provisionne son équipe (mots de passe
  temporaires à usage unique). Isolation stricte des données entre cabinets (`establishmentId`
  sur `User`/`Patient`, testée dans `tests/tenancy.test.ts`).
- **Avis patients** (`/avis` côté cabinet, note + commentaire sur la fiche praticien) : un patient
  laisse un avis après un RDV honoré ; modération (masquer/republier) côté cabinet.
- **Recherche avancée** (`/recherche`) : prochain créneau disponible affiché par praticien
  (calculé sur 14 jours, tous motifs réservables confondus), filtre "téléconsultation
  uniquement", tri par disponibilité ou par note moyenne.
- **Liste d'attente** (`/liste-attente` côté cabinet, section dédiée sur `/mes-rendez-vous` côté
  patient) : un patient s'inscrit quand aucun créneau ne lui convient ; notification automatique
  (SMS/email) dès qu'un RDV compatible est annulé, ou notification manuelle par le cabinet
  (`src/lib/waitlist.ts`).
- **CRM : pipeline prospects + tickets SAV** (`/crm`) : suivi commercial des cabinets démarchés
  (Kanban Nouveau → Contacté → Qualifié → Gagné/Perdu) et tickets de support (priorité, statut
  Ouvert → En cours → Résolu).
- **Pièces jointes & photo de profil** : image ou PDF joint aux messages (messagerie interne,
  messagerie patients, `/mes-messages`), 5 Mo max, stocké en base64 (`src/lib/attachments.ts`) ;
  photo de profil praticien (`/parametres/profil`, 2 Mo max) affichée sur la fiche publique et
  dans les résultats de recherche.

### Sécurité & qualité
- 2FA (TOTP) optionnelle pour les comptes professionnels (`/parametres/securite`).
- Journal d'activité consultable par l'admin (`/admin/journal`).
- PWA installable (manifest + service worker), mode sombre.
- Tests Vitest + CI GitHub Actions (voir §Tests).

## Simplifications assumées du MVP

Documentées ici pour transparence — à traiter avant une mise en production réelle :

- **Fuseau horaire** : les horaires sont traités en heure serveur/navigateur, sans gestion
  explicite de fuseau (`Europe/Paris` implicite). À industrialiser avec `date-fns-tz`/Luxon et
  un fuseau par établissement si multi-régions.
- **Impression du planning mensuel** : utilise l'impression navigateur (`window.print()`) plutôt
  qu'une génération PDF serveur dédiée.
- **Salle d'attente vidéo** : approximée par le "Lobby" Jitsi (premier arrivé = modérateur sans
  authentification). Fiable pour une démo, à sécuriser avec JaaS/JWT ou un self-host authentifié
  en production (voir tableau ci-dessus).
- **Dédoublonnage patients invités** : une réservation invité recherche un patient existant par
  email exact ; la fusion manuelle de doublons existe (`/patients/[id]`) mais n'est pas
  automatique/suggérée.
- **Messagerie temps réel** : sondage 3s plutôt que WebSocket/push (voir tableau stack).
- **Taux de remplissage** (tableau de bord) : dérivé des plages hebdomadaires récurrentes sans
  soustraire les congés ponctuels — une tendance, pas un chiffre de facturation.
- **Mode sombre** : les couleurs de texte Tailwind fixes (`text-slate-900`, etc.) sont repeintes
  globalement en CSS plutôt que converties en variantes `dark:` par composant.

## Annuaire national des professionnels de santé — pourquoi il n'y a pas "tous les médecins de France"

Ce projet ne contient **aucune donnée de praticien inventée** au-delà du jeu de démonstration
explicitement identifié comme tel. Il n'existe pas de fichier public "tous les médecins de France"
qu'on puisse importer tel quel : la source légitime est le **Répertoire Partagé des Professionnels
de Santé (RPPS/ADELI)**, publié par l'Agence du Numérique en Santé via **Annuaire Santé**
(annuaire.sante.fr / esante.gouv.fr).

`src/lib/directory.ts` prépare l'intégration : `searchLocalPractitioners()` (praticiens inscrits,
réservables en ligne — ce que `/recherche` utilisait déjà) et `searchAnnuaireSante()` (stub prêt à
brancher sur l'API officielle, retourne `[]` tant que `ANNUAIRE_SANTE_API_KEY` n'est pas
configurée). Un praticien remonté depuis l'annuaire national s'affiche toujours avec
`bookableOnline: false` : l'app ne doit jamais laisser réserver un créneau chez un praticien qui
n'a pas configuré son propre agenda sur la plateforme, même si ses coordonnées publiques sont
connues. Pour activer une vraie recherche nationale, il faut s'inscrire comme développeur sur
esante.gouv.fr et implémenter l'appel FHIR dans `searchAnnuaireSante()` (non vérifié en ligne
lors de l'écriture de ce document — revalider le format d'API actuel).

## Architecture & roadmap

Les Blocs 1 à 4 sont implémentés avec de vraies fonctionnalités (voir section précédente), pas
de simples modèles vides. Ce qui reste explicitement hors périmètre :

- **Signature électronique** réelle (le compteur "signatures restantes" existe dans `Quota`,
  mais aucun fournisseur — Yousign, DocuSign — n'est branché).
- **Pipeline prospects / leads** en amont du devis (le CRM démarre au devis).
- **Tickets SAV / support**.
- **Vraie messagerie temps réel** (WebSocket/push) à la place du polling actuel.
- **Bloc 5 (LGC réglementé type Weda)** : **non démarré intentionnellement** — dossier médical
  électronique, prescription assistée (LAP), facturation SESAM-Vitale. Ce bloc déclenche des
  obligations réglementaires fortes (voir section suivante) à cadrer avec un juriste santé
  numérique avant tout développement.

## Conformité santé — points à trancher avant mise en production

⚠️ Ceci n'est pas un avis juridique. Le cadre français (ANS, CNIL, Assurance Maladie) évolue ;
faites valider par un DPO / avocat spécialisé santé numérique avant toute mise en production
avec de vraies données de santé.

- **Hébergement HDS** : ce projet n'est pas déployé chez un hébergeur certifié HDS. Choisir un
  hébergeur certifié pour toute donnée de santé réelle (base de données ET service de visio).
- **RGPD/CNIL** : pas d'AIPD/PIA réalisée, pas de registre des traitements ni de DPO désigné dans
  ce livrable — à faire avant toute donnée réelle. Le mot de passe est haché (bcrypt), les accès
  sont journalisés (`JournalActivite`), mais aucun chiffrement au repos n'est configuré côté
  application (à couvrir par le choix d'un hébergeur Postgres certifié HDS avec chiffrement au repos).
- **Téléconsultation** : `meet.jit.si` (démo) n'est pas conforme HDS — voir tableau stack ci-dessus.
- **Ségur du numérique en santé / PGSSI-S / Pro Santé Connect / INS / DMP / MSSanté** : non
  implémentés (hors périmètre Bloc 1-4).
- **Bloc 5 uniquement** : un logiciel de gestion de cabinet avec dossier médical + prescription +
  facturation Assurance Maladie nécessite l'agrément CNDA (SESAM-Vitale), la certification HAS du
  LAP, et potentiellement un marquage CE (dispositif médical). À ne pas développer sans
  accompagnement réglementaire dédié.
- **2FA** : disponible (TOTP), mais optionnelle — la rendre obligatoire pour les comptes
  professionnels avant mise en production avec de vraies données de santé.

## Déploiement

Le projet est une application Next.js standard (compatible Vercel, ou tout hébergeur Node.js) :

```bash
npm run build
npm start
```

### Déployer sur Vercel — tout en cloud, sans rien lancer en local

Les migrations Prisma s'exécutent automatiquement à chaque build (`npm run build` inclut
`prisma migrate deploy`), et le jeu de données de démonstration se génère via une route HTTP
protégée par un secret. Aucune connexion locale à la base n'est nécessaire.

1. **Importer le repo** : sur [vercel.com](https://vercel.com) → *Add New → Project* → sélectionner
   le repo GitHub `eurlmarion83-ops/crm`, branche `claude/medical-appointment-platform-yc036s`.
   Vercel détecte Next.js automatiquement (aucune config de build à changer).
2. **Créer la base Postgres** : onglet *Storage* du projet Vercel → *Create Database* → Postgres
   (Neon). Vercel connecte automatiquement `DATABASE_URL` aux variables d'environnement du projet.
3. **Variables d'environnement** à renseigner dans *Settings → Environment Variables* :
   - `DATABASE_URL` (fournie par l'étape 2, déjà branchée automatiquement)
   - `AUTH_SECRET` → générer avec `openssl rand -base64 32` (n'importe où : votre terminal, un
     générateur en ligne...)
   - `NEXTAUTH_URL` → l'URL Vercel du déploiement (ex. `https://votre-projet.vercel.app`) —
     à renseigner après le premier déploiement, puis redéployer
   - `SEED_SECRET` → une valeur aléatoire de votre choix (sert uniquement à protéger l'étape 5)
   - `NEXT_PUBLIC_JITSI_DOMAIN` → `meet.jit.si` pour démo (voir avertissement HDS plus haut)
   - `TWILIO_*` / `RESEND_API_KEY` → optionnel, laisser vide pour rester en mode mock (console)
   - `CRON_SECRET` → optionnel, à définir si vous protégez `/api/cron/reminders`
4. **Déployer** : Vercel build automatiquement au push sur la branche (les migrations s'appliquent
   pendant le build, via `prisma migrate deploy`). Une fois en ligne, ouvrez l'URL du déploiement.
5. **Générer les données de démonstration** : visitez, dans votre navigateur,
   `https://votre-projet.vercel.app/api/setup/seed-demo?secret=VOTRE_SEED_SECRET`
   (la valeur que vous avez mise dans `SEED_SECRET`). La réponse JSON confirme la création et
   liste les [comptes de démonstration](#comptes-de-démonstration). Cette route refuse de
   s'exécuter si des données existent déjà (protection anti-écrasement) — ajoutez `&force=true`
   pour forcer une réinitialisation complète si besoin.
6. Se connecter avec les comptes de démonstration.
7. **Rappels automatiques** : un `vercel.json` avec un cron toutes les 30 min vers
   `/api/cron/reminders` est déjà inclus. ⚠️ Le plan Hobby de Vercel limite les crons à une
   exécution par jour — passer en plan Pro pour la fréquence 30 min, ou utiliser un cron externe
   (GitHub Actions, cron-job.org…) appelant cette route avec l'en-tête
   `Authorization: Bearer <CRON_SECRET>`.

### Autres points à adapter en production (tout hébergeur)

1. Renseigner `TWILIO_*` et `RESEND_API_KEY` pour des envois SMS/e-mail réels.
2. Remplacer `NEXT_PUBLIC_JITSI_DOMAIN` par une instance conforme HDS (voir section Conformité).
3. Générer un nouvel `AUTH_SECRET` en production, ne jamais réutiliser celui de démo.
