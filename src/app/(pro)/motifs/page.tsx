import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getManageablePractitioners } from "@/lib/agenda-data";
import { MOTIF_TYPE_LABELS } from "@/lib/enums";
import { createMotifAction, updateMotifAction, deleteMotifAction, duplicateMotifsAction } from "./actions";

export default async function MotifsPage({
  searchParams,
}: {
  searchParams: Promise<{ praticien?: string }>;
}) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const practitioners = await getManageablePractitioners(user);
  const { praticien } = await searchParams;
  const activeId = praticien ?? practitioners[0]?.id;
  const active = practitioners.find((p) => p.id === activeId);

  const motifs = active
    ? await prisma.motif.findMany({ where: { practitionerId: active.id }, orderBy: { sortOrder: "asc" } })
    : [];

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Motifs de consultation</h1>
      <p className="text-slate-600">
        Chaque praticien gère sa propre liste de motifs : couleur, durée, type et visibilité en ligne.
      </p>

      {practitioners.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {practitioners.map((p) => (
            <a
              key={p.id}
              href={`/motifs?praticien=${p.id}`}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                p.id === activeId ? "border-brand bg-brand-light text-brand-dark" : "border-border hover:bg-brand-light"
              }`}
            >
              {p.user.firstName} {p.user.lastName}
            </a>
          ))}
        </div>
      )}

      {active && (
        <>
          <div className="mt-6 flex flex-col gap-3">
            {motifs.map((m) => (
              <form key={m.id} action={updateMotifAction} className="card flex flex-wrap items-center gap-3 p-4">
                <input type="hidden" name="motifId" value={m.id} />
                <input type="color" name="color" defaultValue={m.color} className="h-9 w-9 rounded border border-border" />
                <input name="name" defaultValue={m.name} className="min-w-[180px] flex-1 rounded-lg border border-border px-3 py-2 text-sm" />
                <select name="type" defaultValue={m.type} className="rounded-lg border border-border px-2 py-2 text-sm">
                  {Object.entries(MOTIF_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  name="durationMin"
                  defaultValue={m.durationMin}
                  min={5}
                  step={5}
                  className="w-20 rounded-lg border border-border px-2 py-2 text-sm"
                />
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" name="onlineBookable" defaultChecked={m.onlineBookable} />
                  Réservable en ligne
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" name="active" defaultChecked={m.active} />
                  Actif
                </label>
                {!m.active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Inactif</span>}
                {m.onlineBookable && m.active && (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">En ligne</span>
                )}
                <label className="flex items-center gap-1 text-xs">
                  Prix (€)
                  <input
                    type="number"
                    name="prixEuros"
                    step="0.01"
                    min="0"
                    defaultValue={m.priceCents != null ? (m.priceCents / 100).toFixed(2) : ""}
                    placeholder="gratuit"
                    className="w-20 rounded-lg border border-border px-2 py-1 text-sm"
                  />
                </label>
                <button className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark">
                  Enregistrer
                </button>
                <button
                  formAction={deleteMotifAction}
                  className="rounded-full border border-danger px-3 py-1.5 text-xs text-danger hover:bg-danger hover:text-white"
                >
                  Supprimer
                </button>
              </form>
            ))}
            {motifs.length === 0 && <p className="text-sm text-slate-500">Aucun motif pour le moment.</p>}
          </div>

          <form action={createMotifAction} className="card mt-6 flex flex-wrap items-end gap-3 p-4">
            <input type="hidden" name="practitionerId" value={active.id} />
            <label className="flex flex-col gap-1 text-xs">
              Couleur
              <input type="color" name="color" defaultValue="#2563eb" className="h-9 w-9 rounded border border-border" />
            </label>
            <label className="flex flex-1 min-w-[180px] flex-col gap-1 text-xs">
              Nom du motif
              <input name="name" required placeholder="Ex : Consultation de suivi" className="rounded-lg border border-border px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Type
              <select name="type" defaultValue="CABINET" className="rounded-lg border border-border px-2 py-2 text-sm">
                {Object.entries(MOTIF_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Durée (min)
              <input type="number" name="durationMin" defaultValue={30} min={5} step={5} className="w-20 rounded-lg border border-border px-2 py-2 text-sm" />
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" name="onlineBookable" />
              Réservable en ligne
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Prix (€, optionnel)
              <input type="number" name="prixEuros" step="0.01" min="0" placeholder="gratuit" className="w-24 rounded-lg border border-border px-2 py-2 text-sm" />
            </label>
            <button className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
              Ajouter le motif
            </button>
          </form>

          {practitioners.length > 1 && (
            <form action={duplicateMotifsAction} className="card mt-4 flex flex-wrap items-center gap-3 p-4">
              <input type="hidden" name="fromPractitionerId" value={active.id} />
              <p className="text-sm">Dupliquer ces motifs vers :</p>
              <select name="toPractitionerId" className="rounded-lg border border-border px-2 py-2 text-sm">
                {practitioners.filter((p) => p.id !== active.id).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.user.firstName} {p.user.lastName}
                  </option>
                ))}
              </select>
              <button className="rounded-full border border-border px-4 py-2 text-sm hover:bg-brand-light">
                Dupliquer (créés désactivés en ligne par sécurité)
              </button>
            </form>
          )}

          <p className="mt-4 rounded-lg bg-brand-light p-3 text-xs text-slate-700">
            Par défaut, un nouveau motif n&apos;est pas réservable en ligne : activez-le volontairement une fois
            prêt. Les motifs internes (ex. « Planning personnel », « Laboratoire ») doivent rester décochés pour
            ne jamais apparaître côté patient.
          </p>
        </>
      )}
    </main>
  );
}
