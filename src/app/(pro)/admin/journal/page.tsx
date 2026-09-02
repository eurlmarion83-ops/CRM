import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getVisiblePractitioners } from "@/lib/agenda-data";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const admin = await requireUser(["ADMIN"]);
  const { action } = await searchParams;

  // Isolation multi-tenant : un admin ne voit que le journal de son propre cabinet (lui-même,
  // ses praticiens, et les secrétaires qui leur sont assignées) — jamais celui d'un autre client
  // de la plateforme.
  const practitioners = await getVisiblePractitioners(admin);
  const practitionerIds = practitioners.map((p) => p.id);
  const secretaryAssignments = practitionerIds.length
    ? await prisma.secretaryAssignment.findMany({
        where: { practitionerId: { in: practitionerIds } },
        include: { secretary: true },
      })
    : [];
  const scopedUserIds = [
    admin.id,
    ...practitioners.map((p) => p.userId),
    ...secretaryAssignments.map((a) => a.secretary.userId),
  ];

  const entries = await prisma.journalActivite.findMany({
    where: { userId: { in: scopedUserIds }, ...(action ? { action } : {}) },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const distinctActions = await prisma.journalActivite.findMany({
    where: { userId: { in: scopedUserIds } },
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  });

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Journal d&apos;activité</h1>
      <p className="text-slate-600">Traçabilité des actions sensibles (RGPD, sécurité).</p>

      <form className="mt-4 flex gap-3">
        <select name="action" defaultValue={action ?? ""} className="rounded-lg border border-border px-3 py-2 text-sm">
          <option value="">Toutes les actions</option>
          {distinctActions.map((a) => (
            <option key={a.action} value={a.action}>
              {a.action}
            </option>
          ))}
        </select>
        <button className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Filtrer</button>
      </form>

      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="pb-2">Date</th>
            <th className="pb-2">Utilisateur</th>
            <th className="pb-2">Action</th>
            <th className="pb-2">Entité</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-t border-border">
              <td className="py-2 whitespace-nowrap">{e.createdAt.toLocaleString("fr-FR")}</td>
              <td className="py-2">{e.user ? `${e.user.firstName} ${e.user.lastName}` : "—"}</td>
              <td className="py-2">{e.action}</td>
              <td className="py-2">
                {e.entityType}
                {e.entityId ? ` #${e.entityId.slice(0, 8)}` : ""}
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={4} className="py-3 text-slate-500">
                Aucune entrée.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
