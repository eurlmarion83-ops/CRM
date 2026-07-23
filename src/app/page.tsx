import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-brand-dark">MedCRM</span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/recherche" className="hover:text-brand-dark">
              Trouver un praticien
            </Link>
            <Link
              href="/connexion"
              className="rounded-full bg-brand px-4 py-2 text-white hover:bg-brand-dark"
            >
              Espace professionnel
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 flex flex-col items-start gap-6">
        <h1 className="text-4xl font-bold max-w-2xl leading-tight text-slate-900">
          Rendez-vous médical, téléconsultation et CRM dans un seul outil.
        </h1>
        <p className="max-w-xl text-slate-600">
          Recherchez un praticien, réservez en ligne un créneau au cabinet ou en
          vidéo, et laissez votre équipe piloter agenda, rappels et facturation
          depuis une seule plateforme.
        </p>
        <div className="flex gap-3">
          <Link
            href="/recherche"
            className="rounded-full bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark"
          >
            Prendre rendez-vous
          </Link>
          <Link
            href="/connexion"
            className="rounded-full border border-border bg-surface px-6 py-3 font-medium hover:bg-brand-light"
          >
            Se connecter (praticien / secrétariat)
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 grid gap-6 sm:grid-cols-3">
        {[
          {
            title: "Prise de RDV en ligne",
            desc: "Agenda temps réel, motifs personnalisables, rappels SMS/e-mail automatiques.",
          },
          {
            title: "Téléconsultation intégrée",
            desc: "Visio dans le navigateur, salle d'attente virtuelle, sans installation.",
          },
          {
            title: "Pilotage du cabinet",
            desc: "Tableau de bord, indicateurs, CRM commercial et télé-secrétariat (extensions).",
          },
        ].map((f) => (
          <div key={f.title} className="card p-6">
            <h3 className="font-semibold text-brand-dark">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
