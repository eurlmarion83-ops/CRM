import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type FacturePdfInput = {
  numero: string;
  clientNom: string;
  objet: string;
  montant: number;
  dateEmission: Date;
  dateEcheance?: Date | null;
};

export async function generateFacturePdf(input: FacturePdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const marginX = 56;

  page.drawText("MedCRM", { x: marginX, y, size: 16, font: fontBold, color: rgb(0.05, 0.49, 0.55) });
  y -= 30;
  page.drawText(`Facture n° ${input.numero}`, { x: marginX, y, size: 14, font: fontBold });
  y -= 20;
  page.drawText(`Émise le ${input.dateEmission.toLocaleDateString("fr-FR")}`, { x: marginX, y, size: 10, font });
  if (input.dateEcheance) {
    y -= 14;
    page.drawText(`Échéance : ${input.dateEcheance.toLocaleDateString("fr-FR")}`, { x: marginX, y, size: 10, font });
  }

  y -= 40;
  page.drawLine({ start: { x: marginX, y }, end: { x: 595 - marginX, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 30;

  page.drawText("Client :", { x: marginX, y, size: 11, font: fontBold });
  page.drawText(input.clientNom, { x: marginX + 60, y, size: 11, font });
  y -= 20;
  page.drawText("Objet :", { x: marginX, y, size: 11, font: fontBold });
  page.drawText(input.objet, { x: marginX + 60, y, size: 11, font });

  y -= 50;
  page.drawText("Montant total", { x: marginX, y, size: 12, font: fontBold });
  page.drawText(`${input.montant.toLocaleString("fr-FR")} €`, { x: 595 - marginX - 100, y, size: 14, font: fontBold });

  return pdfDoc.save();
}
