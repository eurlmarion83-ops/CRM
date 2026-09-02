"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { generateTotpSecret, verifyTotpCode } from "@/lib/totp";

export type TwoFactorState = { error?: string; success?: boolean } | undefined;

export async function generateTwoFactorSecretAction() {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret, twoFactorEnabled: false } });
  revalidatePath("/parametres/securite");
}

export async function confirmTwoFactorAction(_prev: TwoFactorState, formData: FormData): Promise<TwoFactorState> {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const code = String(formData.get("code") ?? "").trim();

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!dbUser.twoFactorSecret) return { error: "Générez d'abord un code QR." };

  if (!verifyTotpCode(dbUser.twoFactorSecret, dbUser.email, code)) {
    return { error: "Code invalide. Vérifiez l'heure de votre téléphone et réessayez." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  await prisma.journalActivite.create({
    data: { userId: user.id, action: "2FA_ACTIVEE", entityType: "User", entityId: user.id },
  });
  revalidatePath("/parametres/securite");
  return { success: true };
}

export async function disableTwoFactorAction() {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
  await prisma.journalActivite.create({
    data: { userId: user.id, action: "2FA_DESACTIVEE", entityType: "User", entityId: user.id },
  });
  revalidatePath("/parametres/securite");
}
