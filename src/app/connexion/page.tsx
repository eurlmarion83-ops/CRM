import Link from "next/link";
import { LoginForm } from "./login-form";

export default function ConnexionPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold text-brand-dark">Connexion</h1>
        <p className="mt-1 text-sm text-slate-600">
          Praticien, secrétaire, administrateur ou patient.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <div className="mt-6 space-y-2 text-sm text-slate-600">
          <p>
            Pas encore de compte patient ?{" "}
            <Link href="/inscription" className="text-brand-dark underline">
              Créer un compte
            </Link>
          </p>
          <p>
            Vous êtes un professionnel de santé et n&apos;avez pas encore de cabinet sur MedCRM ?{" "}
            <Link href="/inscription-cabinet" className="text-brand-dark underline">
              Créer votre espace cabinet
            </Link>
          </p>
          <p className="rounded-lg bg-brand-light p-3 text-xs leading-relaxed">
            Démo : voir <code>README.md</code> pour les comptes de démonstration
            (praticien, secrétaire, admin, patient).
          </p>
        </div>
      </div>
    </main>
  );
}
