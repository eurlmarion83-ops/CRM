import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { markPaymentPaid } from "@/lib/payments";

/**
 * Webhook Stripe (checkout.session.completed) — confirme le paiement de façon asynchrone et
 * fiable (ne pas se fier uniquement au retour navigateur sur success_url, qui peut être manqué).
 * Inactif tant que STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET ne sont pas configurées.
 */
export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe non configuré" }, { status: 501 });
  }

  const stripe = new Stripe(secretKey);
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.paymentId;
    if (paymentId) await markPaymentPaid(paymentId);
  }

  return NextResponse.json({ received: true });
}
