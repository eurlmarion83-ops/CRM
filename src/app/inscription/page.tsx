import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function InscriptionPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold text-brand-dark">Créer un compte patient</h1>
        <p className="mt-1 text-sm text-slate-600">
          Un compte n&apos;est pas obligatoire pour réserver : vous pouvez aussi
          prendre rendez-vous en tant qu&apos;invité.
        </p>
        <div className="mt-6">
          <SignupForm />
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
