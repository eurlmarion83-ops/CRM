import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getManageablePractitioners } from "@/lib/agenda-data";
import { DAYS_OF_WEEK } from "@/lib/enums";
import {
  createAvailabilityAction,
  deleteAvailabilityAction,
  createTimeOffAction,
  deleteTimeOffAction,
} from "./actions";

export default async function DisponibilitesPage({
  searchParams,
}: {
  searchParams: Promise<{ praticien?: string }>;
}) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const practitioners = await getManageablePractitioners(user);
  const { praticien } = await searchParams;
  const activeId = praticien ?? practitioners[0]?.id;
  const active = practitioners.find((p) => p.id === activeId);

  const [availabilities, timeOffs, motifs] = active
    ? await Promise.all([
        prisma.availability.findMany({ where: { practitionerId: active.id }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
        prisma.timeOff.findMany({ where: { practitionerId: active.id }, orderBy: { start: "desc" } }),
        prisma.motif.findMany({ where: { practitionerId: active.id, active: true } }),
      ])
    : [[], [], []];

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Disponibilités</h1>
      <p className="text-slate-600">Plages d&apos;ouverture récurrentes et congés / jours fermés.</p>

      {practitioners.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {practitioners.map((p) => (
            <a
              key={p.id}
              href={`/disponibilites?praticien=${p.id}`}
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
          <section className="mt-6">
            <h2 className="font-semibold text-slate-900">Plages hebdomadaires récurrentes</h2>
            <div className="mt-3 flex gap-1">
              {DAYS_OF_WEEK.map((d, i) => {
                const covered = availabilities.some((a) => a.dayOfWeek === i);
                return (
                  <div key={d} className="flex flex-1 flex-col items-center gap-1">
                    <span
                      className={`h-2 w-full rounded-full ${covered ? "bg-brand" : "bg-slate-100"}`}
                      title={covered ? `${d} : couvert` : `${d} : aucune plage`}
                    />
                    <span className="text-[10px] text-slate-500">{d.slice(0, 3)}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {availabilities.map((a) => (
                <form key={a.id} action={deleteAvailabilityAction} className="card flex items-center justify-between p-3 text-sm">
                  <input type="hidden" name="availabilityId" value={a.id} />
                  <span className="flex items-center gap-2">
                    <strong>{DAYS_OF_WEEK[a.dayOfWeek]}</strong> · {a.startTime}–{a.endTime} · créneaux {a.slotDurationMin} min
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.visibility === "PUBLIC" ? "bg-brand-light text-brand-dark" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {a.visibility === "PUBLIC" ? "Visible patient" : "Interne"}
                    </span>
                  </span>
                  <button className="rounded-full border border-danger px-3 py-1 text-xs text-danger hover:bg-danger hover:text-white">
                    Supprimer
                  </button>
                </form>
              ))}
              {availabilities.length === 0 && <p className="text-sm text-slate-500">Aucune plage définie.</p>}
            </div>

            <form action={createAvailabilityAction} className="card mt-4 flex flex-wrap items-end gap-3 p-4">
              <input type="hidden" name="practitionerId" value={active.id} />
              <label className="flex flex-col gap-1 text-xs">
                Jour
                <select name="dayOfWeek" className="rounded-lg border border-border px-2 py-2 text-sm">
                  {DAYS_OF_WEEK.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                Début
                <input type="time" name="startTime" defaultValue="09:00" className="rounded-lg border border-border px-2 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                Fin
                <input type="time" name="endTime" defaultValue="18:00" className="rounded-lg border border-border px-2 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                Granularité (min)
                <input type="number" name="slotDurationMin" defaultValue={15} min={5} step={5} className="w-20 rounded-lg border border-border px-2 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                Visibilité
                <select name="visibility" className="rounded-lg border border-border px-2 py-2 text-sm">
                  <option value="PUBLIC">Visible patient</option>
                  <option value="INTERNAL">Interne (secrétariat/téléphone uniquement)</option>
                </select>
              </label>
              {motifs.length > 0 && (
                <div className="flex flex-col gap-1 text-xs">
                  Restreindre à certains motifs (optionnel)
                  <div className="flex flex-wrap gap-2">
                    {motifs.map((m) => (
                      <label key={m.id} className="flex items-center gap-1 rounded-full border border-border px-2 py-1">
                        <input type="checkbox" name="motifIds" value={m.id} />
                        {m.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <button className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                Ajouter la plage
              </button>
            </form>
          </section>

          <section className="mt-8">
            <h2 className="font-semibold text-slate-900">Congés / jours fermés</h2>
            <div className="mt-2 flex flex-col gap-2">
              {timeOffs.map((t) => (
                <form key={t.id} action={deleteTimeOffAction} className="card flex items-center justify-between p-3 text-sm">
                  <input type="hidden" name="timeOffId" value={t.id} />
                  <span className="flex items-center gap-2">
                    {t.end < new Date() && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Passé</span>
                    )}
                    {t.start.toLocaleString("fr-FR")} → {t.end.toLocaleString("fr-FR")} {t.reason ? `(${t.reason})` : ""}
                  </span>
                  <button className="rounded-full border border-danger px-3 py-1 text-xs text-danger hover:bg-danger hover:text-white">
                    Supprimer
                  </button>
                </form>
              ))}
              {timeOffs.length === 0 && <p className="text-sm text-slate-500">Aucun congé programmé.</p>}
            </div>

            <form action={createTimeOffAction} className="card mt-4 flex flex-wrap items-end gap-3 p-4">
              <input type="hidden" name="practitionerId" value={active.id} />
              <label className="flex flex-col gap-1 text-xs">
                Du
                <input type="datetime-local" name="start" required className="rounded-lg border border-border px-2 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                Au
                <input type="datetime-local" name="end" required className="rounded-lg border border-border px-2 py-2 text-sm" />
              </label>
              <label className="flex flex-1 min-w-[160px] flex-col gap-1 text-xs">
                Motif
                <input name="reason" placeholder="Ex : Vacances, formation..." className="rounded-lg border border-border px-3 py-2 text-sm" />
              </label>
              <button className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                Ajouter
              </button>
            </form>
          </section>
        </>
      )}
    </main>
  );
}
