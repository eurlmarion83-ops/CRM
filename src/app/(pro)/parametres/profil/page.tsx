import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { PhotoUpload } from "./photo-upload";

export default async function ProfilPage() {
  const user = await requireUser(["PRACTITIONER"]);
  const practitioner = await prisma.practitioner.findUniqueOrThrow({ where: { userId: user.id }, include: { user: true } });

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Mon profil</h1>
      <p className="text-slate-600">
        Cette photo est visible par les patients sur votre fiche et dans les résultats de recherche.
      </p>

      <div className="card mt-6 max-w-lg p-6">
        <PhotoUpload
          currentPhotoUrl={practitioner.photoUrl}
          initials={`${practitioner.user.firstName[0]}${practitioner.user.lastName[0]}`}
        />
      </div>
    </main>
  );
}
