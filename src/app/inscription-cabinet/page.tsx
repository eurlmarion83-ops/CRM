import Link from "next/link";
import { CabinetSignupForm } from "./signup-form";

export default function InscriptionCabinetPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="card w-full max-w-lg p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Nouveau cabinet</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">Créer l&apos;espace de votre cabinet</h1>
        <p className="mt-1 text-sm text-slate-600">
          Quelques informations et votre agenda en ligne, votre CRM et votre téléconsultation sont prêts.
          Vous pourrez ensuite inviter vos praticiens et votre secrétariat depuis l&apos;onglet Équipe.
        </p>
        <div className="mt-6">
          <CabinetSignupForm />
        </div>
        <p className="mt-6 text-sm text-slate-600">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="text-brand-dark underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
