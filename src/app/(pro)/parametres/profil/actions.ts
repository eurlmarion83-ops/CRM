"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { assertValidAttachment, ALLOWED_IMAGE_TYPES, MAX_PROFILE_PHOTO_BYTES } from "@/lib/attachments";

export async function updatePractitionerPhotoAction(formData: FormData) {
  const user = await requireUser(["PRACTITIONER"]);
  const practitioner = await prisma.practitioner.findUniqueOrThrow({ where: { userId: user.id } });

  const name = String(formData.get("name") ?? "");
  const type = String(formData.get("type") ?? "");
  const data = String(formData.get("data") ?? "");
  if (!data) throw new Error("Aucune image reçue.");

  assertValidAttachment({ name, type, data }, ALLOWED_IMAGE_TYPES, MAX_PROFILE_PHOTO_BYTES);

  await prisma.practitioner.update({ where: { id: practitioner.id }, data: { photoUrl: data } });
  revalidatePath("/parametres/profil");
  revalidatePath(`/praticien/${practitioner.id}`);
  revalidatePath("/recherche");
}

export async function removePractitionerPhotoAction() {
  const user = await requireUser(["PRACTITIONER"]);
  const practitioner = await prisma.practitioner.findUniqueOrThrow({ where: { userId: user.id } });
  await prisma.practitioner.update({ where: { id: practitioner.id }, data: { photoUrl: null } });
  revalidatePath("/parametres/profil");
  revalidatePath(`/praticien/${practitioner.id}`);
  revalidatePath("/recherche");
}
