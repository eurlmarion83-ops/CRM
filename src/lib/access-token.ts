import crypto from "node:crypto";

// Jeton signé (HMAC) permettant à un patient invité (sans compte) de retrouver et
// annuler/reporter son rendez-vous depuis le lien de confirmation envoyé par email/SMS.
// Ne remplace pas une authentification forte : portée strictement limitée à un RDV donné.

const secret = process.env.AUTH_SECRET ?? "dev-secret-change-me";

export function signAppointmentToken(appointmentId: string): string {
  const hmac = crypto.createHmac("sha256", secret).update(appointmentId).digest("hex");
  return `${appointmentId}.${hmac.slice(0, 24)}`;
}

export function verifyAppointmentToken(token: string): string | null {
  const [appointmentId, sig] = token.split(".");
  if (!appointmentId || !sig) return null;
  const expected = signAppointmentToken(appointmentId).split(".")[1];
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return appointmentId;
}
