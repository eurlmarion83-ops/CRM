-- AlterTable
ALTER TABLE "MessageInterne" ADD COLUMN     "attachmentData" TEXT,
ADD COLUMN     "attachmentName" TEXT,
ADD COLUMN     "attachmentType" TEXT;

-- AlterTable
ALTER TABLE "MessagePatient" ADD COLUMN     "attachmentData" TEXT,
ADD COLUMN     "attachmentName" TEXT,
ADD COLUMN     "attachmentType" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "establishmentId" TEXT;

-- CreateTable
CREATE TABLE "Avis" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "publie" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeAttente" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "motifId" TEXT NOT NULL,
    "preferredFrom" TIMESTAMP(3),
    "preferredTo" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListeAttente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuiviProspect" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'NOUVEAU',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuiviProspect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'OUVERT',
    "priorite" TEXT NOT NULL DEFAULT 'NORMALE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Avis_appointmentId_key" ON "Avis"("appointmentId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "RendezVous"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeAttente" ADD CONSTRAINT "ListeAttente_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeAttente" ADD CONSTRAINT "ListeAttente_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeAttente" ADD CONSTRAINT "ListeAttente_motifId_fkey" FOREIGN KEY ("motifId") REFERENCES "Motif"("id") ON DELETE CASCADE ON UPDATE CASCADE;
