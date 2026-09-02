"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getManageablePractitioners } from "@/lib/agenda-data";

async function assertManageable(practitionerId: string) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const manageable = await getManageablePractitioners(user);
  if (!manageable.some((p) => p.id === practitionerId)) {
    throw new Error("Vous ne pouvez pas gérer ce praticien.");
  }
  return user;
}

function parsePriceCents(formData: FormData): number | null {
  const raw = String(formData.get("prixEuros") ?? "").trim();
  if (!raw) return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
}

export async function createMotifAction(formData: FormData) {
  const practitionerId = String(formData.get("practitionerId") ?? "");
  await assertManageable(practitionerId);

  const count = await prisma.motif.count({ where: { practitionerId } });

  await prisma.motif.create({
    data: {
      practitionerId,
      name: String(formData.get("name") ?? "Nouveau motif"),
      color: String(formData.get("color") ?? "#2563eb"),
      durationMin: Number(formData.get("durationMin") ?? 30),
      type: String(formData.get("type") ?? "CABINET"),
      onlineBookable: formData.get("onlineBookable") === "on",
      priceCents: parsePriceCents(formData),
      sortOrder: count,
    },
  });
  revalidatePath("/motifs");
}

export async function updateMotifAction(formData: FormData) {
  const motifId = String(formData.get("motifId") ?? "");
  const motif = await prisma.motif.findUniqueOrThrow({ where: { id: motifId } });
  await assertManageable(motif.practitionerId);

  await prisma.motif.update({
    where: { id: motifId },
    data: {
      name: String(formData.get("name") ?? motif.name),
      color: String(formData.get("color") ?? motif.color),
      durationMin: Number(formData.get("durationMin") ?? motif.durationMin),
      type: String(formData.get("type") ?? motif.type),
      onlineBookable: formData.get("onlineBookable") === "on",
      active: formData.get("active") === "on",
      priceCents: parsePriceCents(formData),
    },
  });
  revalidatePath("/motifs");
}

export async function deleteMotifAction(formData: FormData) {
  const motifId = String(formData.get("motifId") ?? "");
  const motif = await prisma.motif.findUniqueOrThrow({ where: { id: motifId } });
  await assertManageable(motif.practitionerId);
  await prisma.motif.delete({ where: { id: motifId } });
  revalidatePath("/motifs");
}

export async function duplicateMotifsAction(formData: FormData) {
  const fromId = String(formData.get("fromPractitionerId") ?? "");
  const toId = String(formData.get("toPractitionerId") ?? "");
  await assertManageable(toId);

  const source = await prisma.motif.findMany({ where: { practitionerId: fromId } });
  const existingCount = await prisma.motif.count({ where: { practitionerId: toId } });

  await prisma.motif.createMany({
    data: source.map((m, i) => ({
      practitionerId: toId,
      name: m.name,
      color: m.color,
      durationMin: m.durationMin,
      type: m.type,
      onlineBookable: false, // sécurité : réactiver volontairement après duplication
      sortOrder: existingCount + i,
    })),
  });
  revalidatePath("/motifs");
}
