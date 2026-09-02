import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { generateTotpQrCode } from "@/lib/totp";
import { generateTwoFactorSecretAction, disableTwoFactorAction } from "./actions";
import { ConfirmTwoFactorForm } from "./confirm-form";

export default async function SecuritePage() {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  const qrDataUrl = dbUser.twoFactorSecret && !dbUser.twoFactorEnabled
    ? await generateTotpQrCode(dbUser.twoFactorSecret, dbUser.email)
    : null;

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Sécurité du compte</h1>
      <p className="text-slate-600">Authentification à deux facteurs (TOTP) pour les comptes professionnels.</p>

      <div className="card mt-6 max-w-lg p-6">
        {dbUser.twoFactorEnabled ? (
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-success">Authentification à deux facteurs activée ✓</p>
            <form action={disableTwoFactorAction}>
              <button className="rounded-full border border-danger px-4 py-2 text-sm text-danger hover:bg-danger hover:text-white">
                Désactiver
              </button>
            </form>
          </div>
        ) : qrDataUrl ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">
              Scannez ce QR code avec une application d&apos;authentification (Google Authenticator, Authy...),
              puis saisissez le code généré pour confirmer.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL générée côté serveur, pas d'optimisation next/image utile */}
            <img src={qrDataUrl} alt="QR code d'authentification à deux facteurs" className="h-48 w-48" />
            <ConfirmTwoFactorForm />
          </div>
        ) : (
          <form action={generateTwoFactorSecretAction}>
            <p className="text-sm text-slate-600">
              Renforcez la sécurité de votre compte avec un code à usage unique en plus de votre mot de passe.
            </p>
            <button className="mt-3 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
              Activer l&apos;authentification à deux facteurs
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
