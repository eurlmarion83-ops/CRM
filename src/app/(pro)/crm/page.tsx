import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { createDevisAction } from "./actions";
import { KanbanCard } from "./kanban-card";
import { FactureRow } from "./facture-row";

const COLUMNS = [
  { key: "BROUILLON", label: "Brouillon" },
  { key: "ENVOYE", label: "Envoyé" },
  { key: "SIGNE", label: "Signé" },
  { key: "EXPIRE", label: "Expiré" },
] as const;

export default async function CrmPage() {
  await requireUser(["SECRETARY", "ADMIN"]);

  const [devisList, factures] = await Promise.all([
    prisma.devis.findMany({ orderBy: { dateCreation: "desc" } }),
    prisma.facture.findMany({ orderBy: { dateEmission: "desc" } }),
  ]);

  const caSigne = devisList.filter((d) => d.statut === "SIGNE").reduce((s, d) => s + d.montant, 0);
  const caFacture = factures.reduce((s, f) => s + f.montant, 0);
  const impayes = factures.filter((f) => f.statut !== "PAYEE").reduce((s, f) => s + f.montant, 0);

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">CRM commercial</h1>
      <p className="text-slate-600">Devis, factures, relances — pilotage commercial du cabinet.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500">Devis signés (en cours)</p>
          <p className="mt-1 text-xl font-semibold text-brand-dark">{caSigne.toLocaleString("fr-FR")} €</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500">CA facturé</p>
          <p className="mt-1 text-xl font-semibold text-brand-dark">{caFacture.toLocaleString("fr-FR")} €</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500">Règlements en retard</p>
          <p className="mt-1 text-xl font-semibold text-danger">{impayes.toLocaleString("fr-FR")} €</p>
        </div>
      </div>

      <h2 className="mt-8 font-semibold text-slate-900">Pipeline devis</h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase text-slate-500">{col.label}</p>
            {devisList
              .filter((d) => d.statut === col.key)
              .map((d) => (
                <KanbanCard key={d.id} devis={d} />
              ))}
          </div>
        ))}
      </div>

      <form action={createDevisAction} className="card mt-6 flex flex-wrap items-end gap-3 p-4">
        <p className="w-full font-medium text-slate-900">Nouveau devis</p>
        <input name="clientNom" placeholder="Client" required className="rounded-lg border border-border px-3 py-2 text-sm" />
        <input name="objet" placeholder="Objet" required className="rounded-lg border border-border px-3 py-2 text-sm" />
        <input name="montant" type="number" step="0.01" placeholder="Montant (€)" required className="w-32 rounded-lg border border-border px-3 py-2 text-sm" />
        <input name="contactEmail" type="email" placeholder="Email de contact (relance)" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <button className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Créer</button>
      </form>

      <h2 className="mt-8 font-semibold text-slate-900">Factures</h2>
      <table className="mt-2 w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="pb-2">Numéro</th>
            <th className="pb-2">Client</th>
            <th className="pb-2">Montant</th>
            <th className="pb-2">Statut</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {factures.map((f) => (
            <FactureRow key={f.id} facture={f} />
          ))}
          {factures.length === 0 && (
            <tr>
              <td colSpan={5} className="py-3 text-slate-500">
                Aucune facture pour le moment.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
