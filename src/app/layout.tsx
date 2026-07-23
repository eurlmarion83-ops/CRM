import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedCRM — Rendez-vous, téléconsultation & CRM médical",
  description:
    "Plateforme de prise de rendez-vous médical, téléconsultation vidéo et CRM pour professionnels de santé et télé-secrétariat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
