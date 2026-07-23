import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { createPatientAction } from "./actions";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const { q } = await searchParams;

  const patients = await prisma.patient.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { lastName: "asc" },
    take: 50,
    include: { _count: { select: { appointments: true } } },
  });

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
      <p className="text-slate-600">
        Base patients (Bloc 4 en construction : dossier complet, documents, historique détaillé).
      </p>

      <form className="mt-4 flex gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher un patient (nom, téléphone, email)"
          className="flex-1 rounded-lg border border-border px-3 py-2"
        />
        <button className="rounded-full bg-brand px-5 py-2 font-medium text-white hover:bg-brand-dark">Rechercher</button>
      </form>

      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="pb-2">Nom</th>
            <th className="pb-2">Téléphone</th>
            <th className="pb-2">Email</th>
            <th className="pb-2">RDV</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.id} className="border-t border-border">
              <td className="py-2">
                {p.firstName} {p.lastName}
              </td>
              <td className="py-2">{p.phone ?? "—"}</td>
              <td className="py-2">{p.email ?? "—"}</td>
              <td className="py-2">{p._count.appointments}</td>
            </tr>
          ))}
          {patients.length === 0 && (
            <tr>
              <td colSpan={4} className="py-3 text-slate-500">
                Aucun patient trouvé.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <form action={createPatientAction} className="card mt-8 flex flex-wrap items-end gap-3 p-4">
        <p className="w-full font-medium text-slate-900">Créer un patient</p>
        <input name="firstName" placeholder="Prénom" required className="rounded-lg border border-border px-3 py-2 text-sm" />
        <input name="lastName" placeholder="Nom" required className="rounded-lg border border-border px-3 py-2 text-sm" />
        <input name="phone" placeholder="Téléphone" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <input name="email" placeholder="Email" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <button className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Créer</button>
      </form>
    </main>
  );
}
