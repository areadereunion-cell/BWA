// src/app/api/leads/assigns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

    // ✅ Solo admin/spa pueden asignar (ajústalo si quieres)
    const rol = String(user.rol ?? "").toLowerCase();
    const canAssign = rol === "admin" || rol === "administrador" || rol === "spa" || rol === "rrhh" || rol === "RRHH" || rol === "SpA";
    if (!canAssign) {
      return NextResponse.json({ ok: false, error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json();
    const leadIds = Array.isArray(body.leadIds) ? body.leadIds.map(Number) : null;
    const asesorId = Number(body.asesorId);

    if (!leadIds || leadIds.length === 0 || !asesorId) {
      return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });
    }

    // ✅ Verificar que exista y sea ASESOR
    const asesorRes = await query(
      "SELECT id, nombre, rol FROM users WHERE id = $1",
      [asesorId]
    );
    if (asesorRes.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Asesor no encontrado" }, { status: 404 });
    }

    const asesorRol = String(asesorRes.rows[0].rol ?? "").toLowerCase();
    if (!asesorRol.includes("asesor")) {
      return NextResponse.json({ ok: false, error: "El usuario no es asesor" }, { status: 400 });
    }

    await query(
      "UPDATE leads SET asignado_a = $1 WHERE id = ANY($2::int[])",
      [asesorId, leadIds]
    );

    return NextResponse.json({ ok: true, leadIds, asignado_a: asesorId });
  } catch (err) {
    console.error("Error al asignar asesor:", err);
    return NextResponse.json({ ok: false, error: "Error al asignar asesor" }, { status: 500 });
  }
}
