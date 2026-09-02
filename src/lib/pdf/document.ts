import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type DocumentPdfInput = {
  title: string;
  type: string;
  content: string;
  createdAt: Date;
  practitioner: { firstName: string; lastName: string; specialty: string; address?: string | null; city?: string | null };
  patient: { firstName: string; lastName: string; birthDate?: Date | null };
};

const TYPE_LABELS: Record<string, string> = {
  ORDONNANCE: "Ordonnance",
  CERTIFICAT: "Certificat médical",
  COMPTE_RENDU: "Compte rendu de consultation",
};

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const word of paragraph.split(" ")) {
      if ((current + " " + word).trim().length > maxCharsPerLine) {
        lines.push(current.trim());
        current = word;
      } else {
        current = `${current} ${word}`.trim();
      }
    }
    lines.push(current.trim());
  }
  return lines;
}

/**
 * Génère un PDF simple (en-tête cabinet, identité patient, corps du document) à la volée.
 * Aucun blob n'est stocké : le contenu structuré vit en base (DocumentMedical), le PDF est
 * régénéré à chaque téléchargement — pas de dépendance à un stockage fichier persistant
 * (compatible hébergement serverless).
 */
export async function generateDocumentPdf(input: DocumentPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const marginX = 56;

  page.drawText(`${input.practitioner.firstName} ${input.practitioner.lastName}`, {
    x: marginX,
    y,
    size: 13,
    font: fontBold,
  });
  y -= 16;
  page.drawText(input.practitioner.specialty, { x: marginX, y, size: 10, font });
  y -= 14;
  if (input.practitioner.address || input.practitioner.city) {
    page.drawText(`${input.practitioner.address ?? ""} ${input.practitioner.city ?? ""}`.trim(), {
      x: marginX,
      y,
      size: 10,
      font,
    });
    y -= 14;
  }

  y -= 20;
  page.drawLine({ start: { x: marginX, y }, end: { x: 595 - marginX, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 30;

  page.drawText(TYPE_LABELS[input.type] ?? input.type, { x: marginX, y, size: 16, font: fontBold });
  y -= 18;
  page.drawText(
    `${input.createdAt.toLocaleDateString("fr-FR")} — Patient : ${input.patient.firstName} ${input.patient.lastName}` +
      (input.patient.birthDate ? ` (né(e) le ${input.patient.birthDate.toLocaleDateString("fr-FR")})` : ""),
    { x: marginX, y, size: 10, font }
  );
  y -= 30;

  if (input.title !== (TYPE_LABELS[input.type] ?? input.type)) {
    page.drawText(input.title, { x: marginX, y, size: 12, font: fontBold });
    y -= 22;
  }

  const lines = wrapText(input.content, 90);
  for (const line of lines) {
    if (y < 80) break; // MVP : une seule page ; pagination multi-pages hors périmètre
    page.drawText(line, { x: marginX, y, size: 11, font });
    y -= 16;
  }

  y = Math.max(y - 40, 60);
  page.drawText(`${input.practitioner.firstName} ${input.practitioner.lastName}`, { x: 595 - marginX - 150, y, size: 10, font });
  y -= 14;
  page.drawText("(document généré électroniquement)", { x: 595 - marginX - 150, y, size: 8, font, color: rgb(0.5, 0.5, 0.5) });

  return pdfDoc.save();
}
