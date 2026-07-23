import Link from "next/link";
import { startOfDay, endOfDay, addDays, startOfMonth, subMonths, format } from "date-fns";
import { fr } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/require-user";
import { getVisiblePractitioners } from "@/lib/agenda-data";
import { RevenueChart } from "./revenue-chart";

type AppointmentWithRelations = Prisma.RendezVousGetPayload<{
  include: { patient: true; practitioner: { include: { user: true } }; motif: true };
}>;

export default async function TableauDeBordPage() {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const practitioners = await getVisiblePractitioners(user);
  const practitionerIds = practitioners.map((p) => p.id);

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const tomorrowStart = startOfDay(addDays(today, 1));
  const tomorrowEnd = endOfDay(addDays(today, 1));

  const [rdvToday, rdvTomorrow, quota, devisRecents] = await Promise.all([
    prisma.rendezVous.findMany({
      where: { practitionerId: { in: practitionerIds }, start: { gte: todayStart, lte: todayEnd }, status: "CONFIRMED" },
      include: { patient: true, practitioner: { include: { user: true } }, motif: true },
      orderBy: { start: "asc" },
    }),
    prisma.rendezVous.findMany({
      where: { practitionerId: { in: practitionerIds }, start: { gte: tomorrowStart, lte: tomorrowEnd }, status: "CONFIRMED" },
      include: { patient: true, practitioner: { include: { user: true } }, motif: true },
      orderBy: { start: "asc" },
    }),
    practitioners[0]?.establishmentId
      ? prisma.quota.findUnique({ where: { establishmentId: practitioners[0].establishmentId } })
      : null,
    prisma.devis.findMany({ orderBy: { dateCreation: "desc" }, take: 5 }),
  ]);

  // CA mensuel (Bloc 2 en construction) : agrégation des devis signés des 6 derniers mois, à titre d'aperçu.
  const monthlyRevenue = await Promise.all(
    Array.from({ length: 6 }).map(async (_, i) => {
      const monthStart = startOfMonth(subMonths(today, 5 - i));
      const monthEnd = startOfMonth(subMonths(today, 4 - i));
      const devis = await prisma.devis.findMany({
        where: { statut: "SIGNE", dateCreation: { gte: monthStart, lt: monthEnd } },
      });
      return {
        month: format(monthStart, "LLL", { locale: fr }),
        total: devis.reduce((sum, d) => sum + d.montant, 0),
      };
    })
  );

  const objectifMensuel = 5000;
  const caCeMois = monthlyRevenue[monthlyRevenue.length - 1]?.total ?? 0;
  const pctObjectif = Math.min(100, Math.round((caCeMois / objectifMensuel) * 100));

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Bonjour, {user.name?.split(" ")[0]}</h1>
      <p className="text-slate-600">Voici l&apos;activité du cabinet aujourd&apos;hui.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Vos rendez-vous</h2>
          <AppointmentTabs today={rdvToday} tomorrow={rdvTomorrow} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-semibold text-slate-900">Derniers messages</h2>
            <p className="mt-2 text-sm text-slate-500">
              Messagerie interne et patients — module Bloc 3 (à venir).
            </p>
          </div>
          <div className="card p-5">
            <h2 className="text-sm font-medium text-slate-600">SMS restants</h2>
            <p className="mt-1 text-2xl font-semibold text-brand-dark">{quota?.smsRemaining ?? "—"}</p>
          </div>
          <div className="card p-5">
            <h2 className="text-sm font-medium text-slate-600">Signatures restantes</h2>
            <p className="mt-1 text-2xl font-semibold text-brand-dark">{quota?.signaturesRemaining ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Chiffre d&apos;affaires (devis signés / mois)</h2>
          <RevenueChart data={monthlyRevenue} />
        </div>
        <div className="card p-5 flex flex-col items-center justify-center">
          <h2 className="font-semibold text-slate-900">Objectif du mois</h2>
          <div className="relative mt-4 h-32 w-32">
            <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--border)"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--brand)"
                strokeWidth="3"
                strokeDasharray={`${pctObjectif}, 100`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-brand-dark">
              {pctObjectif}%
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Objectif : {objectifMensuel.toLocaleString("fr-FR")} €</p>
        </div>
      </div>

      <div className="mt-4 card p-5">
        <h2 className="font-semibold text-slate-900">Devis récents (aperçu CRM — Bloc 2)</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="pb-2">Client</th>
              <th className="pb-2">Objet</th>
              <th className="pb-2">Montant</th>
              <th className="pb-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {devisRecents.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="py-2">{d.clientNom}</td>
                <td className="py-2">{d.objet}</td>
                <td className="py-2">{d.montant.toLocaleString("fr-FR")} €</td>
                <td className="py-2">{d.statut}</td>
              </tr>
            ))}
            {devisRecents.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-slate-500">
                  Aucun devis pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Link href="/agenda" className="text-sm text-brand-dark underline">
          Voir l&apos;agenda complet →
        </Link>
      </div>
    </main>
  );
}

function AppointmentTabs({
  today,
  tomorrow,
}: {
  today: AppointmentWithRelations[];
  tomorrow: AppointmentWithRelations[];
}) {
  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase text-slate-500">Aujourd&apos;hui ({today.length})</p>
        <ul className="mt-2 flex flex-col gap-2">
          {today.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span>
                {a.start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} —{" "}
                {a.patient.firstName} {a.patient.lastName}
              </span>
              <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ backgroundColor: a.motif.color }}>
                {a.motif.name}
              </span>
            </li>
          ))}
          {today.length === 0 && <li className="text-sm text-slate-500">Aucun rendez-vous.</li>}
        </ul>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase text-slate-500">Demain ({tomorrow.length})</p>
        <ul className="mt-2 flex flex-col gap-2">
          {tomorrow.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span>
                {a.start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} —{" "}
                {a.patient.firstName} {a.patient.lastName}
              </span>
              <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ backgroundColor: a.motif.color }}>
                {a.motif.name}
              </span>
            </li>
          ))}
          {tomorrow.length === 0 && <li className="text-sm text-slate-500">Aucun rendez-vous.</li>}
        </ul>
      </div>
    </div>
  );
}
