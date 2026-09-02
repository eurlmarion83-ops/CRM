import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyTotpCode } from "@/lib/totp";
import type { Role } from "@/lib/enums";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Vercel (et tout hébergeur derrière un proxy de confiance qui fixe le Host correctement)
  // a besoin de trustHost : sans cela, NextAuth v5 rejette les requêtes en production tant que
  // AUTH_URL n'est pas strictement identique au domaine réel.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/connexion" },
  providers: [
    Credentials({
      name: "Identifiants",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        code: { label: "Code de vérification", type: "text" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email?.toString().toLowerCase().trim();
        const password = credentials?.password?.toString();
        const code = credentials?.code?.toString().trim();
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (user.twoFactorEnabled) {
          if (!user.twoFactorSecret || !code || !verifyTotpCode(user.twoFactorSecret, user.email, code)) {
            return null;
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role as Role,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role: Role }).role;
        token.uid = user.id as string;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
