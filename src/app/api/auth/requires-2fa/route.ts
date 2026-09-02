import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Route publique volontairement minimale : ne renvoie qu'un booléen, jamais si l'email existe
// ou non (même réponse "false" pour un email inconnu et pour un compte sans 2FA).
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  if (!email) return NextResponse.json({ required: false });

  const user = await prisma.user.findUnique({ where: { email }, select: { twoFactorEnabled: true } });
  return NextResponse.json({ required: user?.twoFactorEnabled ?? false });
}
