"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

function generateTempPassword(): string {
  return crypto.randomBytes(9).toString("base64url"); // ~12 caractères lisibles
}

export type TeamActionState = { error?: string; success?: true; email?: string; tempPassword?: string } | undefined;

async function requireAdminEstablishment() {
  const user = await requireUser(["ADMIN"]);
  const admin = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!admin.establishmentId) throw new Error("Votre compte n'est rattaché à aucun cabinet.");
  return { user, establishmentId: admin.establishmentId };
}

export async function createPractitionerAction(_prev: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const { establishmentId } = await requireAdminEstablishment();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const specialty = String(formData.get("specialty") ?? "").trim();

  if (!firstName || !lastName || !email || !specialty) {
    return { error: "Merci de compléter tous les champs." };
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash, role: "PRACTITIONER", firstName, lastName },
  });
  await prisma.practitioner.create({
    data: { userId: user.id, establishmentId, specialty },
  });

  revalidatePath("/equipe");
  return { success: true, email, tempPassword };
}

export async function createSecretaryAction(_prev: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const { establishmentId } = await requireAdminEstablishment();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const practitionerIds = formData.getAll("practitionerIds").map(String);

  if (!firstName || !lastName || !email) {
    return { error: "Merci de compléter tous les champs." };
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  // Sécurité : n'assigner que des praticiens du même cabinet, jamais un praticien d'un autre client.
  const validPractitioners = await prisma.practitioner.findMany({
    where: { id: { in: practitionerIds }, establishmentId },
    select: { id: true },
  });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash, role: "SECRETARY", firstName, lastName },
  });
  const secretaryProfile = await prisma.secretaryProfile.create({ data: { userId: user.id } });
  if (validPractitioners.length > 0) {
    await prisma.secretaryAssignment.createMany({
      data: validPractitioners.map((p) => ({ secretaryId: secretaryProfile.id, practitionerId: p.id })),
    });
  }

  revalidatePath("/equipe");
  return { success: true, email, tempPassword };
}
