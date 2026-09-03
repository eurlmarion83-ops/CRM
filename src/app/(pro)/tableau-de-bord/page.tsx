import Link from "next/link";
import { startOfDay, endOfDay, addDays, startOfMonth, startOfYear, subMonths, format } from "date-fns";
import { fr } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getVisiblePractitioners, getCurrentEstablishmentId } from "@/lib/agenda-data";
import { getPractitionerPerformance } from "@/lib/analytics";
import { RevenueChart } from "./revenue-chart";
import { AppointmentTabs } from "./appointment-tabs";
import { DashboardWidget, EmptyState } from "./dashboard-widget";

export default async function TableauDeBordPage() {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const [establishmentId, practitioners] = await Promise.all([
    getCurrentEstablishmentId(user),
    getVisiblePractitioners(user),
  ]);
  const practitionerIds = practitioners.map((p) => p.id);

  // Portée « équipe » (façon journal d'activité admin) : l'utilisateur courant, ses praticiens
  // visibles et les secrétaires qui leur sont assignées — sert aux widgets d'activité récente.
  const secretaryAssignments = practitionerIds.length
    ? await prisma.secretaryAssignment.findMany({ where: { practitionerId: { in: practitionerIds } }, include: { secretary: true } })
    : [];
  const scopedUserIds = Array.from(
    new Set([user.id, ...practitioners.map((p) => p.userId), ...secretaryAssignments.map((a) => a.secretary.userId)])
  );

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const tomorrowStart = startOfDay(addDays(today, 1));
  const tomorrowEnd = endOfDay(addDays(today, 1));
  const yearStart = startOfYear(today);

  const [
    rdvToday,
    rdvTomorrow,
    quota,
    performance,
    patientConversations,
    facturesYear,
    dernierDevisSigne,
    devisNonTransferes,
    journalEntries,
    tickets,
    prospects,
    listeAttente,
    relances,
  ] = await Promise.all([
    prisma.rendezVous.findMany({
      where: { practitionerId: { in: practitionerIds }, start: { gte: todayStart, lte: todayEnd }, status: "CONFIRMED" },
      include: { patient: true, motif: true },
      orderBy: { start: "asc" },
    }),
    prisma.rendezVous.findMany({
      where: { practitionerId: { in: practitionerIds }, start: { gte: tomorrowStart, lte: tomorrowEnd }, status: "CONFIRMED" },
      include: { patient: true, motif: true },
      orderBy: { start: "asc" },
    }),
    establishmentId ? prisma.quota.findUnique({ where: { establishmentId } }) : null,
    getPractitionerPerformance(practitionerIds, 30),
    prisma.messagePatient.findMany({
      where: {
        conversationPatient: {
          patient: {
            OR: [...(establishmentId ? [{ establishmentId }] : []), { appointments: { some: { practitionerId: { in: practitionerIds } } } }],
          },
        },
      },
      include: { conversationPatient: { include: { patient: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.facture.findMany({ where: { statut: { not: "ANNULEE" }, dateEmission: { gte: yearStart } } }),
    prisma.devis.findFirst({ where: { statut: "SIGNE" }, orderBy: { dateCreation: "desc" } }),
    prisma.devis.findMany({ where: { statut: "SIGNE", facture: null } }),
    scopedUserIds.length
      ? prisma.journalActivite.findMany({ where: { userId: { in: scopedUserIds } }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 5 })
      : [],
    prisma.ticket.findMany({ where: { statut: { in: ["OUVERT", "EN_COURS"] } }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.suiviProspect.findMany({ where: { statut: { notIn: ["GAGNE", "PERDU"] } }, orderBy: { createdAt: "desc" }, take: 5 }),
    practitionerIds.length
      ? prisma.listeAttente.findMany({
          where: { practitionerId: { in: practitionerIds }, statut: { in: ["ACTIVE", "NOTIFIE"] } },
          include: { patient: true, motif: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : [],
    prisma.relance.findMany({ include: { devis: true }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  // CA mensuel (Bloc 2) : agrégation des devis signés des 6 derniers mois, à titre d'aperçu.
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

  const caExercice = facturesYear.reduce((s, f) => s + f.montant, 0);
  const reglementsRetard = facturesYear
    .filter((f) => f.statut === "IMPAYEE" || (f.statut === "EMISE" && f.dateEcheance && f.dateEcheance < today))
    .reduce((s, f) => s + f.montant, 0);
  const devisNonTransferesMontant = devisNonTransferes.reduce((s, d) => s + d.montant, 0);

  const eur = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT`;

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Bonjour, {user.name?.split(" ")[0]}</h1>
      <p className="text-slate-600">
        {format(today, "EEEE d MMMM yyyy", { locale: fr }).replace(/^./, (c) => c.toUpperCase())}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <DashboardWidget title="Derniers messages" color="#3b5478" icon="✉️">
          {patientConversations.length === 0 ? (
            <EmptyState>Aucun message</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {patientConversations.map((m) => (
                <li key={m.id}>
                  <Link href={`/messagerie-patients/${m.conversationPatientId}`} className="block hover:text-brand-dark">
                    <p className="text-sm font-medium text-slate-900">
                      {m.conversationPatient.patient.firstName} {m.conversationPatient.patient.lastName}
                    </p>
                    <p className="truncate text-xs text-slate-500">{m.content || "📎 Pièce jointe"}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashboardWidget>

        <DashboardWidget title="Vos rendez-vous" color="#e08e2d" icon="📅">
          <AppointmentTabs
            today={rdvToday.map((a) => ({
              id: a.id,
              start: a.start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
              patientName: `${a.patient.firstName} ${a.patient.lastName}`,
              motifName: a.motif.name,
              motifColor: a.motif.color,
            }))}
            tomorrow={rdvTomorrow.map((a) => ({
              id: a.id,
              start: a.start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
              patientName: `${a.patient.firstName} ${a.patient.lastName}`,
              motifName: a.motif.name,
              motifColor: a.motif.color,
            }))}
          />
        </DashboardWidget>

        <DashboardWidget title="Graphiques" color="#2f6f7e" icon="📊" className="lg:col-span-2">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="w-full flex-1">
              <RevenueChart data={monthlyRevenue} />
            </div>
            <div className="flex shrink-0 flex-col items-center">
              <div className="relative h-24 w-24">
                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
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
                <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-brand-dark">
                  {pctObjectif}%
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">de vos objectifs atteints</p>
            </div>
          </div>
        </DashboardWidget>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        <DashboardWidget title="Indicateurs commerciaux" color="#7c5cbf" icon="📈" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="CA exercice" value={eur(caExercice)} color="#2f8fd1" />
            <StatTile label="Règlements retard" value={eur(reglementsRetard)} color="#d1435b" />
            <StatTile label="Dernier devis signé" value={eur(dernierDevisSigne?.montant ?? 0)} color="#1f9d55" />
            <StatTile label="Devis non transférés" value={eur(devisNonTransferesMontant)} color="#e08e2d" />
          </div>
        </DashboardWidget>

        <DashboardWidget title="Vos activités" color="#14b8a6" icon="🕒">
          {journalEntries.length === 0 ? (
            <EmptyState>Aucune activité</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {journalEntries.map((j) => (
                <li key={j.id} className="text-slate-600">
                  <span className="text-xs text-slate-400">{j.createdAt.toLocaleDateString("fr-FR")}</span>{" "}
                  {j.user ? `${j.user.firstName} ${j.user.lastName}` : "Système"} — {j.action.replaceAll("_", " ").toLowerCase()}
                </li>
              ))}
            </ul>
          )}
        </DashboardWidget>

        <DashboardWidget title="Tickets ouverts" color="#2563eb" icon="🎫">
          {tickets.length === 0 ? (
            <EmptyState>Aucun ticket ouvert</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {tickets.map((t) => (
                <li key={t.id} className="flex items-center justify-between">
                  <span className="truncate text-slate-700">{t.titre}</span>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-slate-500">{t.priorite}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/crm" className="mt-2 inline-block text-xs text-brand-dark underline">
            Voir le CRM →
          </Link>
        </DashboardWidget>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <DashboardWidget title="Suivis prospects" color="#3f9d5d" icon="🧭">
          {prospects.length === 0 ? (
            <EmptyState>Aucun suivi prévu</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {prospects.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span className="truncate text-slate-700">{p.nom}</span>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-slate-500">{p.statut}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/crm" className="mt-2 inline-block text-xs text-brand-dark underline">
            Voir le CRM →
          </Link>
        </DashboardWidget>

        <DashboardWidget title="Liste d'attente" color="#3f9d5d" icon="⏳">
          {listeAttente.length === 0 ? (
            <EmptyState>Aucun patient en attente</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {listeAttente.map((l) => (
                <li key={l.id} className="truncate text-slate-700">
                  {l.patient.firstName} {l.patient.lastName} — {l.motif.name}
                </li>
              ))}
            </ul>
          )}
          <Link href="/liste-attente" className="mt-2 inline-block text-xs text-brand-dark underline">
            Voir la liste d&apos;attente →
          </Link>
        </DashboardWidget>

        <DashboardWidget title="Relances devis" color="#3f9d5d" icon="📄">
          {relances.length === 0 ? (
            <EmptyState>Aucune relance</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {relances.map((r) => (
                <li key={r.id} className="truncate text-slate-700">
                  <span className="text-xs text-slate-400">{r.createdAt.toLocaleDateString("fr-FR")}</span>{" "}
                  {r.devis.clientNom} — {r.message}
                </li>
              ))}
            </ul>
          )}
        </DashboardWidget>
      </div>

      {performance.length > 0 && (
        <div className="mt-4 card p-5">
          <h2 className="font-semibold text-slate-900">Performance (30 derniers jours)</h2>
          <p className="text-xs text-slate-500">
            Taux de remplissage estimé à partir des plages hebdomadaires déclarées (hors congés
            ponctuels) ; taux de no-show sur les RDV échus.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {performance.map((p) => (
              <div key={p.practitionerId}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium" style={{ color: p.color }}>
                    {p.name}
                  </span>
                  <span className="text-slate-500">
                    Remplissage {p.fillRatePct}% · No-show {p.noShowRatePct}% ({p.totalAppointments} RDV)
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-brand-light">
                  <div className="h-full rounded-full" style={{ width: `${p.fillRatePct}%`, backgroundColor: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-4">
        <QuotaPill icon="📱" label="sms restants" value={quota?.smsRemaining ?? 0} />
        <QuotaPill icon="✍️" label="signatures restantes" value={quota?.signaturesRemaining ?? 0} />
      </div>

      <div className="mt-6">
        <Link href="/agenda" className="text-sm text-brand-dark underline">
          Voir l&apos;agenda complet →
        </Link>
      </div>
    </main>
  );
}

function StatTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <span className="mb-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <p className="text-sm font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function QuotaPill({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="card flex items-center gap-3 px-4 py-3">
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="text-lg font-semibold text-slate-900">
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-success align-middle" />
          {value}
        </p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
