import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/theme-toggle";
import { PatientQuickSearch } from "@/components/patient-quick-search";
import { NotificationBell } from "@/components/notification-bell";
import { getCurrentEstablishmentId, getVisiblePractitioners } from "@/lib/agenda-data";
import { ROLE_LABELS, type Role } from "@/lib/enums";

const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: "/tableau-de-bord", label: "Tableau de bord", roles: ["PRACTITIONER", "SECRETARY", "ADMIN"] },
  { href: "/agenda", label: "Agenda", roles: ["PRACTITIONER", "SECRETARY", "ADMIN"] },
  { href: "/motifs", label: "Motifs", roles: ["PRACTITIONER", "SECRETARY", "ADMIN"] },
  { href: "/disponibilites", label: "Disponibilités", roles: ["PRACTITIONER", "SECRETARY", "ADMIN"] },
  { href: "/patients", label: "Patients", roles: ["PRACTITIONER", "SECRETARY", "ADMIN"] },
  { href: "/avis", label: "Avis patients", roles: ["PRACTITIONER", "SECRETARY", "ADMIN"] },
  { href: "/liste-attente", label: "Liste d'attente", roles: ["PRACTITIONER", "SECRETARY", "ADMIN"] },
  { href: "/parametres/profil", label: "Mon profil", roles: ["PRACTITIONER"] },
  { href: "/taches", label: "Tâches", roles: ["PRACTITIONER", "SECRETARY", "ADMIN"] },
  { href: "/messagerie", label: "Messagerie interne", roles: ["PRACTITIONER", "SECRETARY", "ADMIN"] },
  { href: "/messagerie-patients", label: "Messagerie patients", roles: ["PRACTITIONER", "SECRETARY", "ADMIN"] },
  { href: "/crm", label: "CRM commercial", roles: ["SECRETARY", "ADMIN"] },
  { href: "/equipe", label: "Équipe", roles: ["ADMIN"] },
  { href: "/parametres/securite", label: "Sécurité", roles: ["PRACTITIONER", "SECRETARY", "ADMIN"] },
  { href: "/admin/journal", label: "Journal d'activité", roles: ["ADMIN"] },
];

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const [pendingTaskCount, establishmentId, visiblePractitioners] = await Promise.all([
    prisma.tache.count({ where: { assigneId: user.id, statut: { not: "FAIT" } } }),
    getCurrentEstablishmentId(user),
    getVisiblePractitioners(user),
  ]);
  const practitionerIds = visiblePractitioners.map((p) => p.id);
  const [pendingPatientMessages, openTicketCount] = await Promise.all([
    prisma.conversationPatient.count({
      where: {
        statut: "A_TRAITER",
        patient: {
          OR: [...(establishmentId ? [{ establishmentId }] : []), { appointments: { some: { practitionerId: { in: practitionerIds } } } }],
        },
      },
    }),
    prisma.ticket.count({ where: { statut: { in: ["OUVERT", "EN_COURS"] } } }),
  ]);

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-56 flex-col border-r border-border bg-surface p-4 sm:flex">
        <Link href="/tableau-de-bord" className="mb-6 text-lg font-semibold text-brand-dark">
          MedCRM
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.filter((item) => item.roles.includes(user.role)).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-brand-light hover:text-brand-dark"
            >
              {item.label}
              {item.href === "/taches" && pendingTaskCount > 0 && (
                <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-white">{pendingTaskCount}</span>
              )}
              {item.href === "/messagerie-patients" && pendingPatientMessages > 0 && (
                <span className="rounded-full bg-warning px-2 py-0.5 text-xs text-white">{pendingPatientMessages}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6 text-xs text-slate-500">
          <div className="mb-3">
            <ThemeToggle />
          </div>
          <p className="font-medium text-slate-700">{user.name}</p>
          <p>{ROLE_LABELS[user.role]}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="mt-2 underline hover:text-brand-dark">Déconnexion</button>
          </form>
        </div>
      </aside>
      <div className="flex flex-1 min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-2 sm:px-6">
          <PatientQuickSearch />
          <NotificationBell
            items={[
              { label: "Tâches à faire", count: pendingTaskCount, href: "/taches" },
              { label: "Messages patients à traiter", count: pendingPatientMessages, href: "/messagerie-patients" },
              { label: "Tickets ouverts", count: openTicketCount, href: "/crm" },
            ]}
          />
        </header>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
