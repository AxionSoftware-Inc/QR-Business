import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const value = url.searchParams.get("url") ?? "";
  const title = url.searchParams.get("title") ?? "QR Business";

  if (!value) {
    return Response.json({ detail: "url is required." }, { status: 400 });
  }

  const qr = await QRCode.toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 8,
  });
  const image = Buffer.from(qr.split(",")[1] ?? "", "base64");
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const qrImage = await doc.embedPng(image);

  const centerText = (text: string, y: number, size: number, isBold = false, color = rgb(0.06, 0.09, 0.16)) => {
    const face = isBold ? bold : font;
    const width = face.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: Math.max(28, (page.getWidth() - width) / 2),
      y,
      size,
      font: face,
      color,
    });
  };

  centerText(title.slice(0, 60), 800, 18, true);
  centerText(value.slice(0, 88), 780, 9, false, rgb(0.39, 0.45, 0.55));

  const startX = 48;
  const startY = 580;
  const cellW = 162;
  const cellH = 180;
  const qrSize = 112;

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const x = startX + col * cellW;
      const y = startY - row * cellH;
      page.drawRectangle({
        x,
        y,
        width: 140,
        height: 158,
        borderColor: rgb(0.8, 0.84, 0.89),
        borderWidth: 1,
      });
      page.drawImage(qrImage, { x: x + 14, y: y + 34, width: qrSize, height: qrSize });

      const stickerTitle = title.slice(0, 28);
      const titleWidth = bold.widthOfTextAtSize(stickerTitle, 9);
      page.drawText(stickerTitle, {
        x: x + Math.max(8, (140 - titleWidth) / 2),
        y: y + 20,
        size: 9,
        font: bold,
        color: rgb(0.06, 0.09, 0.16),
      });

      const shortUrl = value.slice(0, 42);
      const urlWidth = font.widthOfTextAtSize(shortUrl, 6.5);
      page.drawText(shortUrl, {
        x: x + Math.max(8, (140 - urlWidth) / 2),
        y: y + 9,
        size: 6.5,
        font,
        color: rgb(0.39, 0.45, 0.55),
      });
    }
  }

  const pdf = await doc.save();

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": "attachment; filename=\"qr-stickers.pdf\"",
      "Content-Type": "application/pdf",
    },
  });
}
