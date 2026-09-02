"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export type LoginState = { error?: string } | undefined;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "");

  try {
    await signIn("credentials", { email, password, code, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Email, mot de passe ou code de vérification incorrect." };
    }
    throw err;
  }

  // On ne relit pas la session via auth() ici : le cookie tout juste posé par signIn()
  // n'est pas garanti d'être visible dans la même requête (course entre écriture et lecture),
  // ce qui renvoyait certains patients vers l'accueil au lieu de leur espace après connexion.
  const user = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  redirect(user?.role === "PATIENT" ? "/mes-rendez-vous" : "/tableau-de-bord");
}
