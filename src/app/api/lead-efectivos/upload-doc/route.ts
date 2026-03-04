import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

const ALLOWED_FIELDS = [
  "doc_cedula",
  "doc_licencia",
  "doc_servicio_basico",
  "doc_certificado_bancario",
  "doc_comprobante_fondeo",
  "doc_solicitud_firmada",
  "doc_cotizacion_inversion",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

function mimeToResourceType(mime: string): "image" | "raw" {
  if (mime === "application/pdf") return "raw";
  return "image";
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();

    const leadId = Number(formData.get("leadId"));
    const fieldRaw = String(formData.get("field") || "");
    const file = formData.get("file");

    if (!leadId || !fieldRaw || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Datos incompletos" }, { status: 400 });
    }

    if (!ALLOWED_FIELDS.includes(fieldRaw as AllowedField)) {
      return NextResponse.json({ ok: false, error: "Campo inválido" }, { status: 400 });
    }

    const field = fieldRaw as AllowedField;

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Archivo demasiado grande (máx 10MB)" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: `Tipo de archivo no permitido: ${file.type}` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const resourceType = mimeToResourceType(file.type);

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `crm/leads/${leadId}/venta`,
          resource_type: resourceType,
          public_id: `${field}-${Date.now()}`,
          overwrite: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      stream.end(buffer);
    });

    const url = String(uploadResult?.secure_url || "");
    const public_id = String(uploadResult?.public_id || "");

    if (!url || !public_id) {
      return NextResponse.json(
        { ok: false, error: "Cloudinary no devolvió url/public_id", detail: uploadResult },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      url,
      public_id,
      resource_type: uploadResult?.resource_type || null,
      original_filename: uploadResult?.original_filename || null,
    });
  } catch (e: any) {
    console.error("UPLOAD VENTA DOC ERROR:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Error interno" },
      { status: 500 }
    );
  }
}