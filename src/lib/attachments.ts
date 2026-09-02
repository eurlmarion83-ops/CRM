// Pièces jointes (messagerie) et photo de profil : stockées en base64 directement dans la ligne
// (pas de stockage fichier externe requis, compatible hébergement serverless). Les tailles sont
// plafonnées ici pour éviter d'alourdir démesurément la base de données.

export const MAX_MESSAGE_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 Mo
export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024; // 2 Mo

export const ALLOWED_MESSAGE_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export type AttachmentInput = { name: string; type: string; data: string };

function approxDecodedBytes(dataUrl: string): number {
  const base64 = dataUrl.includes(",") ? dataUrl.slice(dataUrl.indexOf(",") + 1) : dataUrl;
  return Math.floor((base64.length * 3) / 4);
}

export function assertValidAttachment(
  attachment: AttachmentInput | null | undefined,
  allowedTypes: string[],
  maxBytes: number
) {
  if (!attachment) return;
  if (!allowedTypes.includes(attachment.type)) {
    throw new Error("Type de fichier non autorisé.");
  }
  if (approxDecodedBytes(attachment.data) > maxBytes) {
    throw new Error(`Fichier trop volumineux (${Math.floor(maxBytes / (1024 * 1024))} Mo maximum).`);
  }
}
