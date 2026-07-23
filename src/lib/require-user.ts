import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/lib/enums";

export async function requireUser(allowedRoles?: Role[]) {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    redirect("/");
  }
  return session.user;
}
