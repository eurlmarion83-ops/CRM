import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { confirmMockPaymentAction } from "./actions";

export default async function MockPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id }, include: { appointment: { include: { motif: true } } } });
  if (!payment) notFound();

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="card w-full max-w-sm p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-warning">
          Paiement simulé — aucune carte bancaire requise (mode démo)
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900">{payment.appointment.motif.name}</h1>
        <p className="mt-2 text-2xl font-bold text-brand-dark">
          {(payment.amountCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
        </p>
        <p className="mt-4 text-xs text-slate-500">
          En production, cette page est remplacée par un vrai Stripe Checkout dès que
          <code className="mx-1 rounded bg-brand-light px-1">STRIPE_SECRET_KEY</code>
          est configurée.
        </p>
        <form action={confirmMockPaymentAction} className="mt-6">
          <input type="hidden" name="paymentId" value={payment.id} />
          <button className="w-full rounded-full bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark">
            Simuler le paiement
          </button>
        </form>
      </div>
    </main>
  );
}
