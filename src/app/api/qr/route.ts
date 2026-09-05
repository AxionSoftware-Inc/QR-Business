import QRCode from "qrcode";
import { validatePublicQrTarget } from "@/modules/qr/public-target";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const value = validatePublicQrTarget(url.searchParams.get("url") ?? "");
  const format = (url.searchParams.get("format") ?? "png").toLowerCase();

  if (!value) {
    return Response.json({ detail: "A valid platform public URL is required." }, { status: 400 });
  }
  if (format !== "png" && format !== "svg") {
    return Response.json({ detail: "format must be png or svg." }, { status: 400 });
  }

  if (format === "svg") {
    const svg = await QRCode.toString(value, {
      errorCorrectionLevel: "M",
      margin: 1,
      type: "svg",
    });

    return new Response(svg, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": "attachment; filename=\"qr.svg\"",
        "Content-Type": "image/svg+xml",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const buffer = await QRCode.toBuffer(value, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 8,
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": "attachment; filename=\"qr.png\"",
      "Content-Type": "image/png",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
