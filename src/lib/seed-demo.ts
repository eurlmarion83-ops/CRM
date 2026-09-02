import bcrypt from "bcryptjs";
import { addDays, addHours, setHours, setMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";

export const DEMO_PASSWORD = "Demo1234!";

export const DEMO_ACCOUNTS = [
  { role: "Praticienne (médecine générale)", email: "dr.martin@medcrm-demo.fr" },
  { role: "Praticienne (gynécologie)", email: "dr.benali@medcrm-demo.fr" },
  { role: "Praticien (dermatologie)", email: "dr.lefevre@medcrm-demo.fr" },
  { role: "Secrétaire (gère les 3 praticiens)", email: "secretariat@medcrm-demo.fr" },
  { role: "Administrateur", email: "admin@medcrm-demo.fr" },
];

/**
 * Jeu de données de démonstration : réinitialise entièrement les données applicatives
 * (⚠️ destructif) puis recrée établissement, praticiens, secrétaire, admin, motifs,
 * disponibilités, patients, RDV et devis. Utilisé par `prisma/seed.ts` (CLI) et par la
 * route protégée `/api/setup/seed-demo` (déploiement cloud sans accès local à la base).
 */
export async function seedDemoData() {
  // Ordre de suppression contraint par les clés étrangères (les relations sans onDelete:Cascade
  // — ex. l'auteur d'un message — bloquent la suppression de l'utilisateur tant que la ligne
  // qui le référence existe encore).
  await prisma.reminderLog.deleteMany();
  await prisma.teleconsultation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.documentMedical.deleteMany();
  await prisma.tache.deleteMany();
  await prisma.messagePatient.deleteMany();
  await prisma.conversationPatient.deleteMany();
  await prisma.messageInterne.deleteMany();
  await prisma.conversationMember.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.rendezVous.deleteMany();
  await prisma.availabilityMotif.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.timeOff.deleteMany();
  await prisma.motif.deleteMany();
  await prisma.secretaryAssignment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.relance.deleteMany();
  await prisma.facture.deleteMany();
  await prisma.devis.deleteMany();
  await prisma.quota.deleteMany();
  await prisma.practitioner.deleteMany();
  await prisma.secretaryProfile.deleteMany();
  await prisma.journalActivite.deleteMany();
  await prisma.user.deleteMany();
  await prisma.establishment.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const establishment = await prisma.establishment.create({
    data: {
      name: "Cabinet médical du Centre",
      address: "12 rue de la République",
      city: "Lyon",
      zip: "69002",
      phone: "04 78 00 00 00",
    },
  });

  await prisma.quota.create({
    data: { establishmentId: establishment.id, smsRemaining: 250, signaturesRemaining: 15 },
  });

  // --- Praticiens -----------------------------------------------------------
  const drMartinUser = await prisma.user.create({
    data: {
      email: "dr.martin@medcrm-demo.fr",
      passwordHash,
      role: "PRACTITIONER",
      firstName: "Claire",
      lastName: "Martin",
      phone: "0601020304",
    },
  });
  const drMartin = await prisma.practitioner.create({
    data: {
      userId: drMartinUser.id,
      establishmentId: establishment.id,
      specialty: "Médecine générale",
      bio: "Médecin généraliste, consultations et téléconsultations de suivi.",
      address: "12 rue de la République",
      city: "Lyon",
      color: "#0d7d8c",
      paymentMethods: "CB, Chèque, Espèces",
      cancellationDeadlineH: 24,
    },
  });

  const drBenaliUser = await prisma.user.create({
    data: {
      email: "dr.benali@medcrm-demo.fr",
      passwordHash,
      role: "PRACTITIONER",
      firstName: "Yasmine",
      lastName: "Benali",
      phone: "0601020305",
    },
  });
  const drBenali = await prisma.practitioner.create({
    data: {
      userId: drBenaliUser.id,
      establishmentId: establishment.id,
      specialty: "Gynécologie",
      bio: "Gynécologue-obstétricienne.",
      address: "12 rue de la République",
      city: "Lyon",
      color: "#b45309",
      paymentMethods: "CB, Chèque",
      cancellationDeadlineH: 48,
    },
  });

  const drLefevreUser = await prisma.user.create({
    data: {
      email: "dr.lefevre@medcrm-demo.fr",
      passwordHash,
      role: "PRACTITIONER",
      firstName: "Thomas",
      lastName: "Lefèvre",
      phone: "0601020306",
    },
  });
  const drLefevre = await prisma.practitioner.create({
    data: {
      userId: drLefevreUser.id,
      establishmentId: establishment.id,
      specialty: "Dermatologie",
      bio: "Dermatologue, consultations au cabinet et par vidéo pour le suivi.",
      address: "12 rue de la République",
      city: "Lyon",
      color: "#6d28d9",
      paymentMethods: "CB",
      cancellationDeadlineH: 24,
    },
  });

  // --- Secrétaire & admin -----------------------------------------------------
  const secretaryUser = await prisma.user.create({
    data: {
      email: "secretariat@medcrm-demo.fr",
      passwordHash,
      role: "SECRETARY",
      firstName: "Nadia",
      lastName: "Dubois",
      phone: "0601020307",
    },
  });
  const secretaryProfile = await prisma.secretaryProfile.create({ data: { userId: secretaryUser.id } });
  await prisma.secretaryAssignment.createMany({
    data: [drMartin, drBenali, drLefevre].map((p) => ({ secretaryId: secretaryProfile.id, practitionerId: p.id })),
  });

  await prisma.user.create({
    data: {
      email: "admin@medcrm-demo.fr",
      passwordHash,
      role: "ADMIN",
      firstName: "Sophie",
      lastName: "Girard",
      phone: "0601020308",
      establishmentId: establishment.id,
    },
  });

  // --- Motifs -----------------------------------------------------------------
  const motifsMartin = await Promise.all(
    [
      { name: "Consultation de médecine générale", color: "#0d7d8c", durationMin: 20, type: "CABINET", onlineBookable: true, sortOrder: 0 },
      { name: "Consultation longue", color: "#0a5f6b", durationMin: 40, type: "CABINET", onlineBookable: true, sortOrder: 1 },
      { name: "Renouvellement de traitement", color: "#38bdf8", durationMin: 15, type: "CABINET", onlineBookable: true, sortOrder: 2 },
      { name: "Consultation vidéo — suivi", color: "#22c55e", durationMin: 20, type: "VIDEO", onlineBookable: true, sortOrder: 3 },
      { name: "Visite à domicile", color: "#f97316", durationMin: 30, type: "DOMICILE", onlineBookable: false, sortOrder: 4 },
      { name: "Urgence (géré par appel)", color: "#dc2626", durationMin: 15, type: "CABINET", onlineBookable: false, sortOrder: 5 },
      { name: "Laboratoire", color: "#94a3b8", durationMin: 10, type: "CABINET", onlineBookable: false, sortOrder: 6 },
      { name: "PLANNING PERSONNEL", color: "#334155", durationMin: 30, type: "CABINET", onlineBookable: false, sortOrder: 7 },
    ].map((m) => prisma.motif.create({ data: { ...m, practitionerId: drMartin.id } }))
  );

  const motifsBenali = await Promise.all(
    [
      { name: "Consultation de gynécologie", color: "#b45309", durationMin: 30, type: "CABINET", onlineBookable: true, sortOrder: 0 },
      { name: "Frottis", color: "#d97706", durationMin: 20, type: "CABINET", onlineBookable: true, sortOrder: 1 },
      { name: "Retrait de DIU", color: "#ca8a04", durationMin: 30, type: "CABINET", onlineBookable: true, sortOrder: 2 },
      { name: "Consultation vidéo — résultats", color: "#22c55e", durationMin: 15, type: "VIDEO", onlineBookable: true, sortOrder: 3 },
    ].map((m) => prisma.motif.create({ data: { ...m, practitionerId: drBenali.id } }))
  );

  const motifsLefevre = await Promise.all(
    [
      { name: "Consultation de dermatologie", color: "#6d28d9", durationMin: 20, type: "CABINET", onlineBookable: true, sortOrder: 0 },
      { name: "Certificat médical", color: "#8b5cf6", durationMin: 10, type: "CABINET", onlineBookable: true, sortOrder: 1 },
      { name: "Vidéo — avis dermatologique", color: "#22c55e", durationMin: 15, type: "VIDEO", onlineBookable: true, sortOrder: 2 },
    ].map((m) => prisma.motif.create({ data: { ...m, practitionerId: drLefevre.id } }))
  );

  // --- Disponibilités (Lun-Ven 9h-18h, granularité 15-20 min) ------------------
  for (const practitioner of [drMartin, drBenali, drLefevre]) {
    for (const dayOfWeek of [1, 2, 3, 4, 5]) {
      await prisma.availability.create({
        data: {
          practitionerId: practitioner.id,
          dayOfWeek,
          startTime: "09:00",
          endTime: "12:30",
          slotDurationMin: 15,
          visibility: "PUBLIC",
        },
      });
      await prisma.availability.create({
        data: {
          practitionerId: practitioner.id,
          dayOfWeek,
          startTime: "14:00",
          endTime: "18:00",
          slotDurationMin: 15,
          visibility: "PUBLIC",
        },
      });
    }
  }

  // --- Patients -----------------------------------------------------------------
  const patientsData = [
    { firstName: "Julie", lastName: "Petit", email: "julie.petit@example.com", phone: "0611111111" },
    { firstName: "Marc", lastName: "Rousseau", email: "marc.rousseau@example.com", phone: "0622222222" },
    { firstName: "Fatima", lastName: "Zahra", email: "fatima.zahra@example.com", phone: "0633333333" },
    { firstName: "Paul", lastName: "Girard", email: "paul.girard@example.com", phone: "0644444444" },
  ];
  const [julie, marc, fatima, paul] = await Promise.all(
    patientsData.map((p) => prisma.patient.create({ data: p }))
  );

  // --- Rendez-vous de démonstration ---------------------------------------------
  function at(daysFromNow: number, hour: number, minute = 0) {
    return setMinutes(setHours(addDays(new Date(), daysFromNow), hour), minute);
  }

  async function createAppointment(opts: {
    practitionerId: string;
    patientId: string;
    motifId: string;
    start: Date;
    durationMin: number;
    video?: boolean;
  }) {
    const appointment = await prisma.rendezVous.create({
      data: {
        practitionerId: opts.practitionerId,
        patientId: opts.patientId,
        motifId: opts.motifId,
        establishmentId: establishment.id,
        start: opts.start,
        end: addHours(opts.start, opts.durationMin / 60),
      },
    });
    if (opts.video) {
      await prisma.teleconsultation.create({ data: { appointmentId: appointment.id, roomName: `rdv-${appointment.id}` } });
    }
    return appointment;
  }

  await createAppointment({ practitionerId: drMartin.id, patientId: julie.id, motifId: motifsMartin[0].id, start: at(0, 10, 0), durationMin: 20 });
  await createAppointment({ practitionerId: drMartin.id, patientId: marc.id, motifId: motifsMartin[3].id, start: at(0, 11, 30), durationMin: 20, video: true });
  await createAppointment({ practitionerId: drBenali.id, patientId: fatima.id, motifId: motifsBenali[0].id, start: at(1, 9, 30), durationMin: 30 });
  await createAppointment({ practitionerId: drLefevre.id, patientId: paul.id, motifId: motifsLefevre[0].id, start: at(1, 15, 0), durationMin: 20 });
  await createAppointment({ practitionerId: drMartin.id, patientId: fatima.id, motifId: motifsMartin[1].id, start: at(3, 14, 30), durationMin: 40 });
  await createAppointment({ practitionerId: drBenali.id, patientId: julie.id, motifId: motifsBenali[3].id, start: at(2, 16, 0), durationMin: 15, video: true });
  // RDV passé (historique)
  await createAppointment({ practitionerId: drMartin.id, patientId: paul.id, motifId: motifsMartin[0].id, start: at(-3, 10, 0), durationMin: 20 });

  // --- Devis (aperçu CRM Bloc 2) --------------------------------------------------
  await prisma.devis.createMany({
    data: [
      { clientNom: "Cabinet Dr Martin", objet: "Abonnement télé-secrétariat annuel", montant: 2400, statut: "SIGNE" },
      { clientNom: "Cabinet Dr Benali", objet: "Pack SMS 500 messages", montant: 90, statut: "ENVOYE" },
      { clientNom: "Centre de santé du Parc", objet: "Relance sur devis de télé-secrétariat", montant: 1800, statut: "BROUILLON" },
    ],
  });

  return { accounts: DEMO_ACCOUNTS, password: DEMO_PASSWORD };
}
