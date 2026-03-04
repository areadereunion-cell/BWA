import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { hashPassword } from "@/lib/auth";

function getToken(req: NextRequest) {
  return req.cookies.get("token")?.value || null;
}

function verify(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET || "") as any;
}

// ---------------------------
// GET – LISTAR USUARIOS
// ---------------------------
export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);

    if (!token) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verify(token);
    } catch {
      const res = NextResponse.json({ ok: false, error: "Token inválido" }, { status: 401 });
      res.cookies.set("token", "", { path: "/", maxAge: 0 });
      return res;
    }

    const userId = decoded.id;
    const userRol = String(decoded.rol || "").toLowerCase();

    // ✅ (opcional pero recomendado) validar en BD que quien consulta siga ACTIVO
    const authCheck = await pool.query(
      `SELECT id, estado_laboral FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    const me = authCheck.rows[0];
    if (!me || me.estado_laboral !== "ACTIVO") {
      const res = NextResponse.json(
        { ok: false, error: "Usuario no activo" },
        { status: 403 }
      );
      res.cookies.set("token", "", { path: "/", maxAge: 0 });
      return res;
    }

    const canSeeAll =
      userRol === "admin" ||
      userRol === "administrador" ||
      userRol === "spa";

    const baseSelect = `
      SELECT
        id,
        nombre,
        correo,
        cedula,
        rol,
        foto_asesor,
        cedula_frontal,
        cedula_reverso,

        -- ✅ laboral (ESTO ARREGLA TU REFRESH)
        estado_laboral,
        motivo_salida,
        fecha_salida,
        motivo_reingreso,
        fecha_reingreso
      FROM users
    `;

    let sql = "";
    let params: any[] = [];

    if (canSeeAll) {
      sql = `
        ${baseSelect}
        ORDER BY id DESC
      `;
    } else {
      sql = `
        ${baseSelect}
        WHERE LOWER(rol) LIKE '%asesor%'
        ORDER BY id DESC
      `;
    }

    const result = await pool.query(sql, params);

    return NextResponse.json({
      ok: true,
      meta: { total: result.rowCount },
      users: result.rows,
    });
  } catch (e) {
    console.log("❌ ERROR EN GET /api/users:", e);
    return NextResponse.json(
      { ok: false, error: "Error obteniendo usuarios" },
      { status: 500 }
    );
  }
}

// ---------------------------
// POST – CREAR USUARIO
// ---------------------------
export async function POST(req: NextRequest) {
  try {
    const token = getToken(req);

    if (!token) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verify(token);
    } catch {
      const res = NextResponse.json({ ok: false, error: "Token inválido" }, { status: 401 });
      res.cookies.set("token", "", { path: "/", maxAge: 0 });
      return res;
    }

    const userRol = String(decoded.rol || "").toLowerCase();

    if (!(userRol === "admin" || userRol === "administrador" || userRol === "spa")) {
      return NextResponse.json(
        { ok: false, error: "Solo admin puede crear" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const hashed = await hashPassword(body.password);

    const sql = `
      INSERT INTO users (
        nombre, correo, cedula, rol, password,
        foto_asesor, cedula_frontal, cedula_reverso,
        estado_laboral
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9,'ACTIVO'))
      RETURNING
        id, nombre, correo, cedula, rol,
        foto_asesor, cedula_frontal, cedula_reverso,
        estado_laboral, motivo_salida, fecha_salida, motivo_reingreso, fecha_reingreso
    `;

    const values = [
      body.nombre,
      body.correo,
      body.cedula,
      body.rol,
      hashed,
      body.foto_asesor || null,
      body.cedula_frontal || null,
      body.cedula_reverso || null,
      body.estado_laboral || "ACTIVO",
    ];

    const result = await pool.query(sql, values);

    return NextResponse.json({ ok: true, user: result.rows[0] });
  } catch (e) {
    console.log("❌ ERROR EN POST /api/users:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } 
}
