import { prisma } from "@/lib/prisma";
import type { ReminderChannel, ReminderKind } from "@/lib/enums";

// Abstraction fournisseur SMS/Email. En développement/démo, les envois sont uniquement
// journalisés (console + ReminderLog) : aucune clé API n'est requise pour tester le MVP.
// En production, renseigner TWILIO_* et/ou RESEND_API_KEY dans .env pour activer les envois réels.

interface SmsProvider {
  send(to: string, body: string): Promise<void>;
}

interface EmailProvider {
  send(to: string, subject: string, body: string): Promise<void>;
}

class ConsoleSmsProvider implements SmsProvider {
  async send(to: string, body: string) {
    console.log(`[SMS mock -> ${to}] ${body}`);
  }
}

class ConsoleEmailProvider implements EmailProvider {
  async send(to: string, subject: string, body: string) {
    console.log(`[Email mock -> ${to}] ${subject}\n${body}`);
  }
}

class TwilioSmsProvider implements SmsProvider {
  async send(to: string, body: string) {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const token = process.env.TWILIO_AUTH_TOKEN!;
    const from = process.env.TWILIO_FROM_NUMBER!;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    if (!res.ok) throw new Error(`Twilio error: ${res.status} ${await res.text()}`);
  }
}

class ResendEmailProvider implements EmailProvider {
  async send(to: string, subject: string, body: string) {
    const apiKey = process.env.RESEND_API_KEY!;
    const from = process.env.EMAIL_FROM ?? "no-reply@example-cabinet.fr";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text: body }),
    });
    if (!res.ok) throw new Error(`Resend error: ${res.status} ${await res.text()}`);
  }
}

function getSmsProvider(): SmsProvider {
  return process.env.TWILIO_ACCOUNT_SID ? new TwilioSmsProvider() : new ConsoleSmsProvider();
}

function getEmailProvider(): EmailProvider {
  return process.env.RESEND_API_KEY ? new ResendEmailProvider() : new ConsoleEmailProvider();
}

/** Envoi d'email générique (hors contexte RDV, ex. relance de devis) — pas de journalisation ReminderLog. */
export async function sendEmail(to: string, subject: string, body: string) {
  await getEmailProvider().send(to, subject, body);
}

/** Envoi SMS générique (hors contexte RDV, ex. notification de liste d'attente) — pas de journalisation ReminderLog. */
export async function sendSms(to: string, body: string) {
  await getSmsProvider().send(to, body);
}

export async function notifyAppointment(params: {
  appointmentId: string;
  kind: ReminderKind;
  to: { phone?: string | null; email?: string | null };
  smsBody: string;
  emailSubject: string;
  emailBody: string;
  establishmentId?: string | null;
}) {
  const channels: ReminderChannel[] = [];

  if (params.to.phone) {
    const quota = params.establishmentId ? await prisma.quota.findUnique({ where: { establishmentId: params.establishmentId } }) : null;
    if (!quota || quota.smsRemaining > 0) {
      await getSmsProvider().send(params.to.phone, params.smsBody);
      channels.push("SMS");
      if (quota) {
        await prisma.quota.update({ where: { establishmentId: params.establishmentId! }, data: { smsRemaining: { decrement: 1 } } });
      }
    }
  }

  if (params.to.email) {
    await getEmailProvider().send(params.to.email, params.emailSubject, params.emailBody);
    channels.push("EMAIL");
  }

  for (const channel of channels) {
    await prisma.reminderLog.create({
      data: { appointmentId: params.appointmentId, channel, kind: params.kind },
    });
  }
}
