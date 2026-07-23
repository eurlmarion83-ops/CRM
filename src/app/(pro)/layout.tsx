import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import { signOut } from "@/auth";
import { ROLE_LABELS } from "@/lib/enums";

const NAV = [
  { href: "/tableau-de-bord", label: "Tableau de bord" },
  { href: "/agenda", label: "Agenda" },
  { href: "/motifs", label: "Motifs" },
  { href: "/disponibilites", label: "Disponibilités" },
  { href: "/patients", label: "Patients" },
];

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-56 flex-col border-r border-border bg-surface p-4 sm:flex">
        <Link href="/tableau-de-bord" className="mb-6 text-lg font-semibold text-brand-dark">
          MedCRM
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 hover:bg-brand-light hover:text-brand-dark"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6 text-xs text-slate-500">
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
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
