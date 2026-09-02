"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";

export type CabinetSignupState = { error?: string } | undefined;

export async function signupCabinetAction(_prev: CabinetSignupState, formData: FormData): Promise<CabinetSignupState> {
  const cabinetName = String(formData.get("cabinetName") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const zip = String(formData.get("zip") ?? "").trim();
  const cabinetPhone = String(formData.get("cabinetPhone") ?? "").trim();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!cabinetName || !address || !city || !firstName || !lastName || !email || !password) {
    return { error: "Merci de compléter tous les champs obligatoires." };
  }
  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const establishment = await prisma.establishment.create({
    data: { name: cabinetName, address, city, zip: zip || null, phone: cabinetPhone || null },
  });

  await prisma.quota.create({
    data: { establishmentId: establishment.id, smsRemaining: 20, signaturesRemaining: 5 },
  });

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "ADMIN",
      firstName,
      lastName,
      phone: phone || null,
      establishmentId: establishment.id,
    },
  });

  await signIn("credentials", { email, password, redirect: false });
  redirect("/equipe?bienvenue=1");
}
