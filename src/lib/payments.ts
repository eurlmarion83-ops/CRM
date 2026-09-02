import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

/**
 * Paiement en ligne de la téléconsultation — abstraction pluggable comme
 * src/lib/notifications.ts. En dev/démo (sans STRIPE_SECRET_KEY), le "checkout" est simulé via
 * une page interne (/paiement/mock/[id]) qui permet de tester le parcours sans compte Stripe.
 * En production, renseigner STRIPE_SECRET_KEY (+ STRIPE_WEBHOOK_SECRET pour la confirmation
 * asynchrone) pour basculer sur un vrai Stripe Checkout.
 */

export type CheckoutSession = { checkoutUrl: string; providerRef: string; provider: "MOCK" | "STRIPE" };

interface PaymentProvider {
  createCheckoutSession(params: { paymentId: string; amountCents: number; description: string; successUrl: string; cancelUrl: string }): Promise<CheckoutSession>;
}

class MockPaymentProvider implements PaymentProvider {
  async createCheckoutSession(params: { paymentId: string }): Promise<CheckoutSession> {
    return { checkoutUrl: `/paiement/mock/${params.paymentId}`, providerRef: `mock_${params.paymentId}`, provider: "MOCK" };
  }
}

class StripePaymentProvider implements PaymentProvider {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }

  async createCheckoutSession(params: {
    paymentId: string;
    amountCents: number;
    description: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: { currency: "eur", unit_amount: params.amountCents, product_data: { name: params.description } },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: { paymentId: params.paymentId },
    });
    return { checkoutUrl: session.url!, providerRef: session.id, provider: "STRIPE" };
  }
}

function getPaymentProvider(): PaymentProvider {
  return process.env.STRIPE_SECRET_KEY ? new StripePaymentProvider() : new MockPaymentProvider();
}

/** Crée (ou réutilise) le paiement lié à un RDV et retourne l'URL de checkout à suivre. */
export async function startAppointmentPayment(appointmentId: string, baseUrl: string) {
  const appointment = await prisma.rendezVous.findUniqueOrThrow({
    where: { id: appointmentId },
    include: { motif: true, payment: true },
  });

  if (!appointment.motif.priceCents) throw new Error("Ce motif n'a pas de paiement en ligne configuré.");
  if (appointment.payment?.status === "PAID") throw new Error("Ce rendez-vous est déjà payé.");

  const payment =
    appointment.payment ??
    (await prisma.payment.create({
      data: { appointmentId, amountCents: appointment.motif.priceCents, status: "PENDING" },
    }));

  const provider = getPaymentProvider();
  const session = await provider.createCheckoutSession({
    paymentId: payment.id,
    amountCents: payment.amountCents,
    description: appointment.motif.name,
    successUrl: `${baseUrl}/confirmation/${appointmentId}?paye=1`,
    cancelUrl: `${baseUrl}/confirmation/${appointmentId}`,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { provider: session.provider, providerRef: session.providerRef },
  });

  return session.checkoutUrl;
}

export async function markPaymentPaid(paymentId: string) {
  await prisma.payment.update({ where: { id: paymentId }, data: { status: "PAID" } });
}
