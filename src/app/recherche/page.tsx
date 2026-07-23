import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ville?: string }>;
}) {
  const { q, ville } = await searchParams;

  const practitioners = await prisma.practitioner.findMany({
    where: {
      acceptsOnlineBooking: true,
      ...(q
        ? {
            OR: [
              { specialty: { contains: q } },
              { user: { firstName: { contains: q } } },
              { user: { lastName: { contains: q } } },
            ],
          }
        : {}),
      ...(ville ? { city: { contains: ville } } : {}),
    },
    include: { user: true, establishment: true, motifs: { where: { onlineBookable: true, active: true } } },
    orderBy: { user: { lastName: "asc" } },
  });

  return (
    <main className="flex-1">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-brand-dark">
            MedCRM
          </Link>
          <Link href="/connexion" className="text-sm hover:text-brand-dark">
            Espace professionnel
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Trouver un praticien</h1>
        <form className="mt-4 flex flex-wrap gap-3 card p-4">
          <input
            name="q"
            defaultValue={q}
            placeholder="Spécialité ou nom du praticien"
            className="flex-1 min-w-[200px] rounded-lg border border-border px-3 py-2"
          />
          <input
            name="ville"
            defaultValue={ville}
            placeholder="Ville"
            className="flex-1 min-w-[150px] rounded-lg border border-border px-3 py-2"
          />
          <button className="rounded-full bg-brand px-5 py-2 font-medium text-white hover:bg-brand-dark">
            Rechercher
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-4">
          {practitioners.length === 0 && (
            <p className="text-slate-600">Aucun praticien ne correspond à votre recherche.</p>
          )}
          {practitioners.map((p) => (
            <Link
              key={p.id}
              href={`/praticien/${p.id}`}
              className="card flex items-center gap-4 p-4 hover:border-brand"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-lg font-semibold text-brand-dark">
                {p.user.firstName[0]}
                {p.user.lastName[0]}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">
                  {p.user.firstName} {p.user.lastName}
                </p>
                <p className="text-sm text-slate-600">{p.specialty}</p>
                <p className="text-sm text-slate-500">
                  {p.address ? `${p.address}, ` : ""}
                  {p.city}
                </p>
              </div>
              <div className="flex flex-wrap gap-1 max-w-[220px] justify-end">
                {p.motifs.slice(0, 3).map((m) => (
                  <span
                    key={m.id}
                    className="rounded-full px-2 py-0.5 text-xs text-white"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.name}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
