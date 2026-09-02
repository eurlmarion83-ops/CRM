import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getVisiblePractitioners } from "@/lib/agenda-data";
import { ROLE_LABELS } from "@/lib/enums";
import { PractitionerForm } from "./practitioner-form";
import { SecretaryForm } from "./secretary-form";

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<{ bienvenue?: string }>;
}) {
  const user = await requireUser(["ADMIN"]);
  const { bienvenue } = await searchParams;

  const practitioners = await getVisiblePractitioners(user);
  const practitionerIds = practitioners.map((p) => p.id);
  const secretaryAssignments = practitionerIds.length
    ? await prisma.secretaryAssignment.findMany({
        where: { practitionerId: { in: practitionerIds } },
        include: { secretary: { include: { user: true } }, practitioner: { include: { user: true } } },
      })
    : [];
  const secretariesById = new Map<string, { user: { firstName: string; lastName: string; email: string }; practitioners: string[] }>();
  for (const a of secretaryAssignments) {
    const entry = secretariesById.get(a.secretary.userId) ?? { user: a.secretary.user, practitioners: [] };
    entry.practitioners.push(`${a.practitioner.user.firstName} ${a.practitioner.user.lastName}`);
    secretariesById.set(a.secretary.userId, entry);
  }

  return (
    <main className="px-6 py-8">
      {bienvenue && (
        <div className="mb-6 card border-brand bg-brand-light p-4 text-sm text-brand-dark">
          Bienvenue sur MedCRM ! Votre cabinet est créé. Ajoutez maintenant vos praticiens et votre
          secrétariat ci-dessous, puis configurez leurs motifs et disponibilités.
        </div>
      )}
      <h1 className="text-2xl font-semibold text-slate-900">Équipe</h1>
      <p className="text-slate-600">Gérez les comptes praticiens et secrétariat de votre cabinet.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Praticiens</h2>
          <div className="flex flex-col gap-2">
            {practitioners.map((p) => (
              <div key={p.id} className="card flex items-center justify-between p-3 text-sm">
                <span>
                  {p.user.firstName} {p.user.lastName} — {p.specialty}
                </span>
                <span className="text-xs text-slate-500">{p.user.email}</span>
              </div>
            ))}
            {practitioners.length === 0 && <p className="text-sm text-slate-500">Aucun praticien pour le moment.</p>}
          </div>
          <div className="mt-3">
            <PractitionerForm />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Secrétariat</h2>
          <div className="flex flex-col gap-2">
            {[...secretariesById.values()].map((s) => (
              <div key={s.user.email} className="card p-3 text-sm">
                <p className="font-medium">
                  {s.user.firstName} {s.user.lastName} <span className="text-xs font-normal text-slate-500">({ROLE_LABELS.SECRETARY})</span>
                </p>
                <p className="text-xs text-slate-500">Gère : {s.practitioners.join(", ")}</p>
              </div>
            ))}
            {secretariesById.size === 0 && <p className="text-sm text-slate-500">Aucune secrétaire pour le moment.</p>}
          </div>
          <div className="mt-3">
            <SecretaryForm practitioners={practitioners.map((p) => ({ id: p.id, name: `${p.user.firstName} ${p.user.lastName}` }))} />
          </div>
        </section>
      </div>
    </main>
  );
}
