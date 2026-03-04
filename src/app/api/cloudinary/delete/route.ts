import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  const { public_id } = await req.json();

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  if (!public_id) {
    return NextResponse.json({ error: "public_id required" }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `public_id=${public_id}&timestamp=${timestamp}`;

  const signature = crypto
    .createHash("sha1")
    .update(paramsToSign + apiSecret)
    .digest("hex");

  // Cloudinary destroy API
  const form = new FormData();
  form.append("public_id", public_id);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);

  const destroyUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;

  // OJO: si subes PDFs como "raw", cambia endpoint a /raw/destroy
  const r = await fetch(destroyUrl, { method: "POST", body: form });
  const data = await r.json();

  if (!r.ok || data?.result !== "ok") {
    return NextResponse.json({ error: "No se pudo borrar", data }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}