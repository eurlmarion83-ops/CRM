-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "establishmentId" TEXT;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
