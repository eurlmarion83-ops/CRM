import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";

const ISSUER = "MedCRM";

export function generateTotpSecret() {
  return new Secret({ size: 20 }).base32;
}

function buildTotp(secretBase32: string, label: string) {
  return new TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
}

export async function generateTotpQrCode(secretBase32: string, label: string): Promise<string> {
  const totp = buildTotp(secretBase32, label);
  return QRCode.toDataURL(totp.toString());
}

/** Vérifie un code TOTP à 6 chiffres, avec une fenêtre de tolérance de ±1 période (30s). */
export function verifyTotpCode(secretBase32: string, label: string, token: string): boolean {
  const totp = buildTotp(secretBase32, label);
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}
