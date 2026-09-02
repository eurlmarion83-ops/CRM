"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";

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

  const session = await auth();
  const role = session?.user.role;
  redirect(role === "PATIENT" ? "/mes-rendez-vous" : "/tableau-de-bord");
}
