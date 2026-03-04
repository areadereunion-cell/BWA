import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

type TipoProducto = "plazo_fijo" | "profuturo";

type Payload = {
  lead_id: number;

  nombre: string;
  correo: string;
  telefono?: string | null;
  telefono_extra?: string | null;

  pais?: string | null;
  asignado_a?: number | null;

  tipo_producto: TipoProducto;
  meses: number;
  monto: number;
  interes: number;

  fecha_lead: string; // YYYY-MM-DD
  fecha_venta?: string;

  // ✅ documentos (Cloudinary)
  doc_cedula_url: string | null;
  doc_cedula_public_id: string | null;

  doc_licencia_url: string | null;
  doc_licencia_public_id: string | null;

  doc_servicio_basico_url: string | null;
  doc_servicio_basico_public_id: string | null;

  doc_certificado_bancario_url: string | null;
  doc_certificado_bancario_public_id: string | null;

  doc_comprobante_fondeo_url: string | null;
  doc_comprobante_fondeo_public_id: string | null;

  doc_solicitud_firmada_url: string | null;
  doc_solicitud_firmada_public_id: string | null;

  doc_cotizacion_inversion_url: string | null;
  doc_cotizacion_inversion_public_id: string | null;
};

function jsonError(message: string, status = 400, detail?: any) {
  return NextResponse.json({ ok: false, message, detail }, { status });
}

function s(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

function requireDoc(url: any, publicId: any, name: string) {
  const u = s(url);
  const p = s(publicId);
  if (!u || !p) return `${name} es requerido.`;
  return null;
}

/* ===========================
  GET: listar ventas
=========================== */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rol = String(user.rol || "").toLowerCase();
  const isAdmin = rol === "admin" || rol === "spa";
  const userId = Number(user.id);

  const client = await pool.connect();
  try {
    const baseQuery = `
      SELECT
        le.id,
        le.lead_id,
        le.nombre,
        le.correo,
        le.telefono,
        le.telefono_extra,
        le.pais,
        le.asignado_a,
        u.nombre AS nombre_asesor,
        le.tipo_producto,
        le.meses,
        le.monto,
        le.interes,
        le.fecha_lead,
        le.fecha_venta,
        le.creado_en,
        le.estado_revision,
        le.solicitud_enviada,

        -- docs
        le.doc_cedula_url,
        le.doc_licencia_url,
        le.doc_servicio_basico_url,
        le.doc_certificado_bancario_url,
        le.doc_comprobante_fondeo_url,
        le.doc_solicitud_firmada_url,
        le.doc_cotizacion_inversion_url

      FROM lead_efectivos le
      LEFT JOIN users u ON u.id = le.asignado_a
    `;

    const q = isAdmin
      ? `${baseQuery} ORDER BY le.fecha_venta DESC LIMIT 500`
      : `${baseQuery} WHERE le.asignado_a = $1 ORDER BY le.fecha_venta DESC LIMIT 500`;

    const params = isAdmin ? [] : [userId];
    const r = await client.query(q, params);

    return NextResponse.json({ ok: true, ventas: r.rows });
  } catch (e: any) {
    console.error("GET /api/lead-efectivos error:", e);
    return jsonError("Error cargando ventas", 500, String(e?.message ?? e));
  } finally {
    client.release();
  }
}

/* ===========================
  POST: crear venta (1 sola vez)
=========================== */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return jsonError("JSON inválido.", 400);
  }

  // básicos
  if (!body?.lead_id || !Number.isFinite(Number(body.lead_id)))
    return jsonError("lead_id es requerido.", 400);

  if (!s(body?.nombre)) return jsonError("nombre es requerido.", 400);
  if (!s(body?.correo)) return jsonError("correo es requerido.", 400);

  if (body.tipo_producto !== "plazo_fijo" && body.tipo_producto !== "profuturo")
    return jsonError("tipo_producto inválido.", 400);

  if (!Number.isFinite(Number(body.meses)) || Number(body.meses) <= 0)
    return jsonError("meses inválido.", 400);

  if (!Number.isFinite(Number(body.monto)) || Number(body.monto) <= 0)
    return jsonError("monto inválido.", 400);

  if (!Number.isFinite(Number(body.interes)) || Number(body.interes) <= 0)
    return jsonError("interes inválido.", 400);

  if (!body.fecha_lead || !/^\d{4}-\d{2}-\d{2}$/.test(body.fecha_lead))
    return jsonError("fecha_lead es requerida (YYYY-MM-DD).", 400);

  const fechaVenta = body.fecha_venta ? new Date(body.fecha_venta) : new Date();
  if (Number.isNaN(fechaVenta.getTime())) return jsonError("fecha_venta inválida.", 400);

  // ✅ reglas interés
  const interesNum = Number(body.interes);
  if (body.tipo_producto === "plazo_fijo") {
    if (interesNum < 1 || interesNum > 3.5) {
      return jsonError("El interés para plazo fijo debe estar entre 1% y 3.5%.", 400);
    }
  } else {
    // profuturo: fijo 3
    if (interesNum !== 3) {
      return jsonError("El interés para Profuturo es fijo en 3%.", 400);
    }
  }

  // ✅ documentos obligatorios (url + public_id)
  const docErrors = [
    requireDoc(body.doc_cedula_url, body.doc_cedula_public_id, "Documento cédula"),
    requireDoc(body.doc_licencia_url, body.doc_licencia_public_id, "Documento licencia"),
    requireDoc(body.doc_servicio_basico_url, body.doc_servicio_basico_public_id, "Documento servicio básico"),
    requireDoc(body.doc_certificado_bancario_url, body.doc_certificado_bancario_public_id, "Documento certificado bancario"),
    requireDoc(body.doc_comprobante_fondeo_url, body.doc_comprobante_fondeo_public_id, "Documento comprobante de fondeo"),
    requireDoc(body.doc_solicitud_firmada_url, body.doc_solicitud_firmada_public_id, "Documento solicitud firmada"),
    requireDoc(body.doc_cotizacion_inversion_url, body.doc_cotizacion_inversion_public_id, "Documento cotización inversión"),
  ].filter(Boolean) as string[];

  if (docErrors.length) {
    return jsonError("Faltan documentos requeridos.", 400, docErrors);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ✅ anti-duplicado: 1 venta por lead_id
    const exists = await client.query(
      `SELECT id, solicitud_enviada FROM lead_efectivos WHERE lead_id = $1 LIMIT 1`,
      [Number(body.lead_id)]
    );

    if (exists.rowCount > 0) {
      await client.query("ROLLBACK");
      return jsonError("Esta solicitud ya fue enviada para este lead.", 409, {
        venta_id: exists.rows[0]?.id,
      });
    }

    const insert = await client.query(
      `
      INSERT INTO lead_efectivos (
        lead_id, nombre, correo, telefono, telefono_extra, pais, asignado_a,
        tipo_producto, meses, monto, interes, fecha_lead, fecha_venta,
        solicitud_enviada,

        doc_cedula_url, doc_cedula_public_id,
        doc_licencia_url, doc_licencia_public_id,
        doc_servicio_basico_url, doc_servicio_basico_public_id,
        doc_certificado_bancario_url, doc_certificado_bancario_public_id,
        doc_comprobante_fondeo_url, doc_comprobante_fondeo_public_id,
        doc_solicitud_firmada_url, doc_solicitud_firmada_public_id,
        doc_cotizacion_inversion_url, doc_cotizacion_inversion_public_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,$13,
        TRUE,

        $14,$15,
        $16,$17,
        $18,$19,
        $20,$21,
        $22,$23,
        $24,$25,
        $26,$27
      )
      RETURNING id
      `,
      [
        Number(body.lead_id),
        s(body.nombre),
        s(body.correo),
        s(body.telefono) || null,
        s(body.telefono_extra) || null,
        body.pais ?? null,
        body.asignado_a ?? null,

        body.tipo_producto,
        Number(body.meses),
        Number(body.monto),
        interesNum,

        body.fecha_lead,
        fechaVenta,

        // docs
        s(body.doc_cedula_url),
        s(body.doc_cedula_public_id),

        s(body.doc_licencia_url),
        s(body.doc_licencia_public_id),

        s(body.doc_servicio_basico_url),
        s(body.doc_servicio_basico_public_id),

        s(body.doc_certificado_bancario_url),
        s(body.doc_certificado_bancario_public_id),

        s(body.doc_comprobante_fondeo_url),
        s(body.doc_comprobante_fondeo_public_id),

        s(body.doc_solicitud_firmada_url),
        s(body.doc_solicitud_firmada_public_id),

        s(body.doc_cotizacion_inversion_url),
        s(body.doc_cotizacion_inversion_public_id),
      ]
    );

    // Mantén esto si tu enum de leads.estado tiene 'venta'
    await client.query(`UPDATE leads SET estado = 'venta' WHERE id = $1`, [
      Number(body.lead_id),
    ]);

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, id: insert.rows[0]?.id ?? null });
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("POST /api/lead-efectivos error:", e);
    return jsonError("Error guardando la venta.", 500, String(e?.message ?? e));
  } finally {
    client.release();
  }
}