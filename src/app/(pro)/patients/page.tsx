import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getVisiblePractitioners, getCurrentEstablishmentId } from "@/lib/agenda-data";
import { createPatientAction } from "./actions";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const { q } = await searchParams;

  const [establishmentId, visiblePractitioners] = await Promise.all([
    getCurrentEstablishmentId(user),
    getVisiblePractitioners(user),
  ]);
  const practitionerIds = visiblePractitioners.map((p) => p.id);

  // Isolation multi-tenant : un patient appartient au carnet d'un cabinet soit parce qu'il y a
  // été créé/rattaché, soit parce qu'il a déjà un RDV avec l'un de ses praticiens (cas d'un
  // patient créé avant cette évolution, ou réservé en ligne avant que le champ existe).
  const scope = {
    OR: [
      ...(establishmentId ? [{ establishmentId }] : []),
      { appointments: { some: { practitionerId: { in: practitionerIds } } } },
    ],
  };

  const [patients, totalCount, upcomingCount] = await Promise.all([
    prisma.patient.findMany({
      where: {
        AND: [
          scope,
          q
            ? {
                OR: [
                  { firstName: { contains: q } },
                  { lastName: { contains: q } },
                  { email: { contains: q } },
                  { phone: { contains: q } },
                ],
              }
            : {},
        ],
      },
      orderBy: { lastName: "asc" },
      take: 50,
      include: { _count: { select: { appointments: true } } },
    }),
    prisma.patient.count({ where: scope }),
    prisma.patient.count({ where: { AND: [scope, { appointments: { some: { status: "CONFIRMED", start: { gte: new Date() } } } }] } }),
  ]);

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
      <p className="text-slate-600">Carnet patients de votre cabinet.</p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full border border-border px-3 py-1.5">
          <strong>{totalCount}</strong> patients
        </span>
        <span className="rounded-full border border-border px-3 py-1.5">
          <strong>{upcomingCount}</strong> avec RDV à venir
        </span>
      </div>

      <form className="mt-4 flex gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher un patient (nom, téléphone, email)"
          className="flex-1 rounded-lg border border-border px-3 py-2"
        />
        <button className="rounded-full bg-brand px-5 py-2 font-medium text-white hover:bg-brand-dark">Rechercher</button>
      </form>

      <div className="mt-6 flex flex-col gap-1">
        {patients.map((p) => (
          <Link
            key={p.id}
            href={`/patients/${p.id}`}
            className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-brand-light"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand-dark">
              {p.firstName[0]}
              {p.lastName[0]}
            </span>
            <span className="w-48 shrink-0 font-medium text-slate-900">
              {p.firstName} {p.lastName}
            </span>
            <span className="w-36 shrink-0 text-slate-600">{p.phone ?? "—"}</span>
            <span className="flex-1 truncate text-slate-600">{p.email ?? "—"}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                p._count.appointments > 0 ? "bg-brand-light text-brand-dark" : "bg-slate-100 text-slate-500"
              }`}
            >
              {p._count.appointments} RDV
            </span>
          </Link>
        ))}
        {patients.length === 0 && <p className="px-2 py-3 text-sm text-slate-500">Aucun patient trouvé.</p>}
      </div>

      <details className="card mt-8 p-4">
        <summary className="cursor-pointer font-medium text-slate-900">+ Créer un patient</summary>
        <form action={createPatientAction} className="mt-3 flex flex-wrap items-end gap-3">
          <input name="firstName" placeholder="Prénom" required className="rounded-lg border border-border px-3 py-2 text-sm" />
          <input name="lastName" placeholder="Nom" required className="rounded-lg border border-border px-3 py-2 text-sm" />
          <input name="phone" placeholder="Téléphone" className="rounded-lg border border-border px-3 py-2 text-sm" />
          <input name="email" placeholder="Email" className="rounded-lg border border-border px-3 py-2 text-sm" />
          <button className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Créer</button>
        </form>
      </details>
    </main>
  );
}
