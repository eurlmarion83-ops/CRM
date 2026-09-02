import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import { PatientThread } from "./patient-thread";

export default async function MesMessagesPage() {
  await requireUser(["PATIENT"]);

  return (
    <main className="flex-1">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/mes-rendez-vous" className="text-lg font-semibold text-brand-dark">
            MedCRM
          </Link>
          <Link href="/mes-rendez-vous" className="text-sm hover:text-brand-dark">
            Mes rendez-vous
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Messagerie sécurisée</h1>
        <p className="text-slate-600">Échangez directement avec le cabinet.</p>
        <div className="mt-4">
          <PatientThread />
        </div>
      </section>
    </main>
  );
}
