// src/app/api/lead-efectivos/delete-doc/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { cloudinary } from "@/lib/cloudinary";

function jsonError(message: string, status = 400, detail?: any) {
  return NextResponse.json({ ok: false, message, detail }, { status });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const public_id = String(body?.public_id || "").trim();
  if (!public_id) return jsonError("public_id requerido.", 400);

  try {
    // resource_type auto ayuda con pdf/imagen
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: "auto",
    });

    if (result?.result !== "ok" && result?.result !== "not found") {
      return jsonError("No se pudo borrar.", 400, result);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("delete-doc error:", e);
    return jsonError("Error borrando archivo.", 500, String(e?.message ?? e));
  }
}