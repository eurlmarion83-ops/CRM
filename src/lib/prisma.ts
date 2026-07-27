import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Singleton Prisma Client (évite d'épuiser les connexions en dev avec le hot-reload Next.js).
// PostgreSQL via driver adapter node-postgres — compatible Vercel Postgres/Neon, Supabase,
// RDS, ou toute base Postgres classique (cf. README §Déploiement).

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
