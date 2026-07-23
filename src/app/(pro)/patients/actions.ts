"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function createPatientAction(formData: FormData) {
  await requireUser(["PRACTITIONER", "SECRETARY", "ADMIN"]);
  await prisma.patient.create({
    data: {
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
    },
  });
  revalidatePath("/patients");
}
