import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Singleton Prisma Client (évite d'épuiser les connexions en dev avec le hot-reload Next.js).
// Choix technique : SQLite + driver adapter en dev/démo (zéro-config, cf. README).
// En production, remplacer par PrismaPg / adapter Postgres (cf. README §Déploiement).

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
