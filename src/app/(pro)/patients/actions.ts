"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getCurrentEstablishmentId } from "@/lib/agenda-data";

export async function createPatientAction(formData: FormData) {
  const user = await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  const establishmentId = await getCurrentEstablishmentId(user);
  await prisma.patient.create({
    data: {
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      establishmentId,
    },
  });
  revalidatePath("/patients");
}
