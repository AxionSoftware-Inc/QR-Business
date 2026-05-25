import QRCode from "qrcode";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const value = url.searchParams.get("url") ?? "";
  const format = url.searchParams.get("format") ?? "png";

  if (!value) {
    return Response.json({ detail: "url is required." }, { status: 400 });
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
      },
    });
  }

  const buffer = await QRCode.toBuffer(value, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 8,
  });

  const body = new Uint8Array(buffer);

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": "attachment; filename=\"qr.png\"",
      "Content-Type": "image/png",
    },
  });
}
