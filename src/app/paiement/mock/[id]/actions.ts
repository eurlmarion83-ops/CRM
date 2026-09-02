"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { markPaymentPaid } from "@/lib/payments";

export async function confirmMockPaymentAction(formData: FormData) {
  const paymentId = String(formData.get("paymentId") ?? "");
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  await markPaymentPaid(paymentId);
  redirect(`/confirmation/${payment.appointmentId}?paye=1`);
}
