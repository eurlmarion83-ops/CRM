import Link from "next/link";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { searchAnnuaireSante } from "@/lib/directory";
import { getAvailableSlots } from "@/lib/scheduling";

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ville?: string; video?: string; tri?: string }>;
}) {
  const { q, ville, video, tri } = await searchParams;
  const videoOnly = video === "1";
  const sortBy = tri === "note" ? "note" : "creneau";

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
      ...(videoOnly ? { motifs: { some: { onlineBookable: true, active: true, type: "VIDEO" } } } : {}),
    },
    include: {
      user: true,
      establishment: true,
      motifs: { where: { onlineBookable: true, active: true } },
      avis: { where: { publie: true } },
    },
    orderBy: { user: { lastName: "asc" } },
  });

  const from = new Date();
  const to = addDays(from, 14);

  const enriched = await Promise.all(
    practitioners.map(async (p) => {
      const slotsByMotif = await Promise.all(
        p.motifs.map((m) => getAvailableSlots(p.id, m.id, { from, to, patientView: true })),
      );
      const allSlots = slotsByMotif.flat().sort((a, b) => a.start.getTime() - b.start.getTime());
      const avgNote = p.avis.length > 0 ? p.avis.reduce((s, a) => s + a.note, 0) / p.avis.length : null;
      return { ...p, nextSlot: allSlots[0]?.start ?? null, avgNote, avisCount: p.avis.length };
    }),
  );

  enriched.sort((a, b) => {
    if (sortBy === "note") {
      return (b.avgNote ?? -1) - (a.avgNote ?? -1);
    }
    if (!a.nextSlot) return 1;
    if (!b.nextSlot) return -1;
    return a.nextSlot.getTime() - b.nextSlot.getTime();
  });

  const externalResults = q || ville ? await searchAnnuaireSante({ q, city: ville }) : [];

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
        <form className="mt-4 flex flex-wrap items-center gap-3 card p-4">
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
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="video" value="1" defaultChecked={videoOnly} />
            Téléconsultation
          </label>
          <select name="tri" defaultValue={sortBy} className="rounded-lg border border-border px-2 py-2 text-sm">
            <option value="creneau">Trier par disponibilité</option>
            <option value="note">Trier par note</option>
          </select>
          <button className="rounded-full bg-brand px-5 py-2 font-medium text-white hover:bg-brand-dark">
            Rechercher
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-4">
          {enriched.length === 0 && (
            <p className="text-slate-600">Aucun praticien ne correspond à votre recherche.</p>
          )}
          {enriched.map((p) => (
            <Link
              key={p.id}
              href={`/praticien/${p.id}`}
              className="card flex items-center gap-4 p-4 hover:border-brand"
            >
              {p.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- photo encodée en base64, pas d'optimisation next/image utile
                <img src={p.photoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-lg font-semibold text-brand-dark">
                  {p.user.firstName[0]}
                  {p.user.lastName[0]}
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-slate-900">
                  {p.user.firstName} {p.user.lastName}
                </p>
                <p className="text-sm text-slate-600">{p.specialty}</p>
                <p className="text-sm text-slate-500">
                  {p.address ? `${p.address}, ` : ""}
                  {p.city}
                </p>
                {p.avgNote !== null && (
                  <p className="text-xs text-warning">
                    {"★".repeat(Math.round(p.avgNote))}
                    {"☆".repeat(5 - Math.round(p.avgNote))}{" "}
                    <span className="text-slate-500">
                      {p.avgNote.toFixed(1)}/5 ({p.avisCount})
                    </span>
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                {p.nextSlot ? (
                  <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                    Prochain RDV : {p.nextSlot.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}{" "}
                    à {p.nextSlot.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">Aucun créneau sous 14 jours</span>
                )}
                <div className="flex flex-wrap gap-1 justify-end">
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
              </div>
            </Link>
          ))}
        </div>

        {externalResults.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Autres professionnels trouvés dans l&apos;annuaire national
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Ces praticiens ne sont pas inscrits sur cette plateforme : contactez-les directement,
              la réservation en ligne n&apos;est pas disponible pour eux ici.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {externalResults.map((r, i) => (
                <div key={i} className="card flex items-center gap-4 p-4 opacity-90">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-500">
                    {r.firstName[0]}
                    {r.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {r.firstName} {r.lastName}
                    </p>
                    <p className="text-sm text-slate-600">{r.specialty}</p>
                    <p className="text-sm text-slate-500">
                      {r.address ? `${r.address}, ` : ""}
                      {r.city} {r.phone ? `· ${r.phone}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-xs text-slate-500">
                    Non réservable en ligne
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
