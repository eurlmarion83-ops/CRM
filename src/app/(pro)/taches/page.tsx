import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { createTacheAction } from "./actions";
import { TacheRow } from "./tache-row";

export default async function TachesPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string }>;
}) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const { vue } = await searchParams;
  const mesTaches = vue !== "equipe";

  const [taches, staff] = await Promise.all([
    prisma.tache.findMany({
      where: mesTaches ? { assigneId: user.id } : undefined,
      include: { assigne: true },
      orderBy: [{ statut: "asc" }, { echeance: "asc" }],
    }),
    prisma.user.findMany({ where: { role: { in: ["PRACTITIONER", "SECRETARY", "ADMIN"] } } }),
  ]);

  const now = new Date();
  const aFaireCount = taches.filter((t) => t.statut !== "FAIT").length;
  const enRetardCount = taches.filter((t) => t.statut !== "FAIT" && t.echeance && t.echeance < now).length;

  return (
    <main className="px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Tâches</h1>
        <div className="flex rounded-full border border-border p-0.5 text-sm">
          <a href="/taches?vue=mine" className={`rounded-full px-3 py-1 ${mesTaches ? "bg-brand text-white" : "hover:bg-brand-light"}`}>
            Mes tâches
          </a>
          <a href="/taches?vue=equipe" className={`rounded-full px-3 py-1 ${!mesTaches ? "bg-brand text-white" : "hover:bg-brand-light"}`}>
            Équipe
          </a>
        </div>
      </div>
      <p className="text-slate-600">
        Tâches manuelles et auto-générées (no-show à rappeler, devis à relancer).
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full border border-border px-3 py-1.5">
          <strong>{aFaireCount}</strong> à faire
        </span>
        {enRetardCount > 0 && (
          <span className="rounded-full bg-danger/10 px-3 py-1.5 text-danger">
            <strong>{enRetardCount}</strong> en retard
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {taches.map((t) => (
          <TacheRow
            key={t.id}
            tache={{
              id: t.id,
              titre: t.titre,
              description: t.description,
              priorite: t.priorite,
              statut: t.statut,
              echeance: t.echeance,
              assigneNom: t.assigne ? `${t.assigne.firstName} ${t.assigne.lastName}` : null,
            }}
          />
        ))}
        {taches.length === 0 && <p className="text-sm text-slate-500">Aucune tâche.</p>}
      </div>

      <form action={createTacheAction} className="card mt-8 flex flex-wrap items-end gap-3 p-4">
        <p className="w-full font-medium text-slate-900">Nouvelle tâche</p>
        <input name="titre" placeholder="Titre" required className="flex-1 min-w-[200px] rounded-lg border border-border px-3 py-2 text-sm" />
        <select name="priorite" defaultValue="NORMALE" className="rounded-lg border border-border px-2 py-2 text-sm">
          <option value="BASSE">Basse</option>
          <option value="NORMALE">Normale</option>
          <option value="HAUTE">Haute</option>
        </select>
        <select name="assigneId" defaultValue={user.id} className="rounded-lg border border-border px-2 py-2 text-sm">
          <option value="">Non assignée</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName}
            </option>
          ))}
        </select>
        <input type="date" name="echeance" className="rounded-lg border border-border px-2 py-2 text-sm" />
        <textarea name="description" placeholder="Description (optionnel)" className="w-full rounded-lg border border-border px-3 py-2 text-sm" rows={2} />
        <button className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Créer</button>
      </form>
    </main>
  );
}
