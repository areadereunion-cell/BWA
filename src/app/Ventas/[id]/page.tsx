"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { downloadFile } from "./utils/downloadFile";

type User = { id: number; rol: string; nombre?: string };

type Venta = {
  id: number;
  lead_id: number;

  nombre: string;
  correo: string;
  telefono: string | null;
  telefono_extra: string | null;

  pais: string | null;
  asignado_a: number | null;
  nombre_asesor?: string | null;

  tipo_producto: "plazo_fijo" | "profuturo" | string;
  meses: number;
  monto: string | number;
  interes: string | number;

  fecha_lead: string;
  fecha_venta: string;
  creado_en: string;

  estado_revision: "pendiente" | "aprobada" | "rechazada" | string;

  // ✅ NUEVOS CAMPOS (URLs y public_id)
  doc_cedula_url?: string | null;
  doc_cedula_public_id?: string | null;

  doc_licencia_url?: string | null;
  doc_licencia_public_id?: string | null;

  doc_servicio_basico_url?: string | null;
  doc_servicio_basico_public_id?: string | null;

  doc_certificado_bancario_url?: string | null;
  doc_certificado_bancario_public_id?: string | null;

  doc_comprobante_fondeo_url?: string | null;
  doc_comprobante_fondeo_public_id?: string | null;

  doc_solicitud_firmada_url?: string | null;
  doc_solicitud_firmada_public_id?: string | null;

  doc_cotizacion_inversion_url?: string | null;
  doc_cotizacion_inversion_public_id?: string | null;
};

type Lead = {
  id: number;
  asignado_a: number | null;
  nombre: string;
  apellido: string | null;
  telefono: string | null;
  correo: string | null;
  origen: string | null;
  estado: string | null;
  codigo_pais: string | null;
  pais: string | null;
  meses_inversion: number | null;
  monto_inversion: number | null;
  fecha: string | null;
};

type Note = {
  id?: number;
  lead_id: number;
  asesor_id?: number | null;
  autor_id?: number | null;
  nota_texto?: string | null;
  contenido?: string | null;
  fecha_hora?: string | null;
  creado_en?: string | null;
};

type DocField =
  | "doc_cedula"
  | "doc_licencia"
  | "doc_servicio_basico"
  | "doc_certificado_bancario"
  | "doc_comprobante_fondeo"
  | "doc_solicitud_firmada"
  | "doc_cotizacion_inversion";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "—";
  return x.toLocaleString("es-ES");
}

function pickNoteText(n: Note) {
  return (n.contenido ?? n.nota_texto ?? "").trim();
}

function safeParseJson(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function normalizeIdParam(p: unknown) {
  if (!p) return "";
  if (Array.isArray(p)) return String(p[0] ?? "");
  return String(p);
}

function isAdminRole(rol?: string | null) {
  const r = String(rol || "").toLowerCase().trim();
  return r === "admin" || r === "spa" || r === "administrador" || r === "spA".toLowerCase();
}

export default function VentaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = useMemo(() => normalizeIdParam((params as any)?.id), [params]);

  const [auth, setAuth] = useState<"loading" | "ok" | "no">("loading");
  const [user, setUser] = useState<User | null>(null);

  const [venta, setVenta] = useState<Venta | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);

  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState("");

  // Agregar nota
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteErr, setNoteErr] = useState("");

  // ✅ Interés editable (solo admin/spa)
  const adminCanEdit = useMemo(() => isAdminRole(user?.rol), [user?.rol]);
  const [interesEdit, setInteresEdit] = useState<string>("");
  const [interesSaving, setInteresSaving] = useState(false);
  const [interesErr, setInteresErr] = useState("");

  // ✅ Upload docs
  const [uploadingDoc, setUploadingDoc] = useState<Record<string, boolean>>({});
  const [docErr, setDocErr] = useState<string>("");

  // Auth
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/verify", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));

        if (!data?.ok || !data?.user?.rol) {
          setAuth("no");
          return;
        }

        setUser({
          id: Number(data.user.id),
          rol: String(data.user.rol),
          nombre: data.user.nombre ? String(data.user.nombre) : undefined,
        });
        setAuth("ok");
      } catch {
        setAuth("no");
      }
    })();
  }, []);

  useEffect(() => {
    if (auth === "no") router.replace("/login");
  }, [auth, router]);

  const load = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setPageErr("");

      // ✅ Ajusta si tu endpoint real es otro:
      // /api/ventas/[id]
      const res = await fetch(`/api/ventas/${id}`, {
        credentials: "include",
        cache: "no-store",
      });

      const text = await res.text();
      const data = safeParseJson(text);

      if (!res.ok) {
        setVenta(null);
        setLead(null);
        setNotes([]);
        setPageErr(data?.message || data?.error || "No se pudo cargar la venta.");
        return;
      }

      const v = (data?.venta ?? null) as Venta | null;
      setVenta(v);
      setLead((data?.lead ?? null) as Lead | null);
      setNotes(Array.isArray(data?.notes) ? data.notes : []);

      // ✅ set default interés editable
      if (v) setInteresEdit(String(v.interes ?? ""));
    } catch (e) {
      console.error(e);
      setPageErr("Error inesperado cargando la venta.");
      setVenta(null);
      setLead(null);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (auth !== "ok") return;
    void load();
  }, [auth, load]);

  async function handleAddNote() {
    const contenido = noteText.trim();
    if (!contenido) {
      setNoteErr("Escribe una nota antes de guardar.");
      return;
    }

    try {
      setNoteSaving(true);
      setNoteErr("");

      const res = await fetch(`/api/ventas/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contenido }),
      });

      const text = await res.text();
      const data = safeParseJson(text);

      if (!res.ok) {
        setNoteErr(data?.message || data?.error || "No se pudo guardar la nota.");
        return;
      }

      setNoteText("");
      setShowNoteForm(false);
      await load();
    } catch (e) {
      console.error(e);
      setNoteErr("Error inesperado guardando la nota.");
    } finally {
      setNoteSaving(false);
    }
  }

  // ✅ Guardar interés (solo admin/spa)
  async function saveInteres() {
    if (!venta) return;
    if (!adminCanEdit) return;

    const val = Number(interesEdit);
    if (!Number.isFinite(val) || val < 0 || val > 5) {
      setInteresErr("Interés inválido. Debe estar entre 0% y 5%.");
      return;
    }

    try {
      setInteresSaving(true);
      setInteresErr("");

      const res = await fetch(`/api/ventas/${id}/update-interes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ interes: val }),
      });

      const text = await res.text();
      const data = safeParseJson(text);

      if (!res.ok) {
        setInteresErr(data?.message || data?.error || "No se pudo actualizar el interés.");
        return;
      }

      // actualiza UI
      setVenta((prev) => (prev ? { ...prev, interes: val } : prev));
    } catch (e) {
      console.error(e);
      setInteresErr("Error inesperado actualizando interés.");
    } finally {
      setInteresSaving(false);
    }
  }

  // ✅ Upload y overwrite doc: sube a cloudinary y luego guarda url/public_id en venta
  async function uploadDoc(file: File, field: DocField) {
    if (!venta) return;

    setDocErr("");
    setUploadingDoc((p) => ({ ...p, [field]: true }));

    try {
      // 1) subir a cloudinary (tu endpoint ya existe)
      const fd = new FormData();
      fd.append("file", file);
      fd.append("field", field);
      fd.append("leadId", String(venta.lead_id));

      const upRes = await fetch("/api/lead-efectivos/upload-doc", {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      const upText = await upRes.text();
      const up = safeParseJson(upText);

      if (!upRes.ok || !up?.ok) {
        setDocErr(up?.error || up?.message || "No se pudo subir el archivo.");
        return;
      }

      const url = String(up.url || "").trim();
      const public_id = String(up.public_id || "").trim();
      if (!url || !public_id) {
        setDocErr("Cloudinary no devolvió url/public_id.");
        return;
      }

      // 2) persistir en BD asociado a la venta
      const saveRes = await fetch(`/api/ventas/${id}/update-doc`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ field, url, public_id }),
      });

      const saveText = await saveRes.text();
      const save = safeParseJson(saveText);

      if (!saveRes.ok || !save?.ok) {
        setDocErr(save?.message || save?.error || "No se pudo guardar en la venta.");
        return;
      }

      // 3) update UI local
      const urlKey = `${field}_url` as keyof Venta;
      const pidKey = `${field}_public_id` as keyof Venta;

      setVenta((prev) =>
        prev
          ? ({
              ...prev,
              [urlKey]: url,
              [pidKey]: public_id,
            } as Venta)
          : prev
      );
    } catch (e) {
      console.error(e);
      setDocErr("Error inesperado subiendo/guardando documento.");
    } finally {
      setUploadingDoc((p) => ({ ...p, [field]: false }));
    }
  }

  const docItems = useMemo(() => {
    return [
      { field: "doc_cedula" as const, label: "Copia de cédula" },
      { field: "doc_licencia" as const, label: "Copia de licencia" },
      { field: "doc_servicio_basico" as const, label: "Servicio básico" },
      { field: "doc_certificado_bancario" as const, label: "Certificado bancario" },
      { field: "doc_comprobante_fondeo" as const, label: "Comprobante de fondeo" },
      { field: "doc_solicitud_firmada" as const, label: "Solicitud firmada" },
      { field: "doc_cotizacion_inversion" as const, label: "Cotización de la inversión" },
    ];
  }, []);

  if (auth === "loading") {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0B0D10] text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-4 shadow-2xl">
          Validando...
        </div>
      </div>
    );
  }

  if (auth === "no") return null;

  return (
    <div className="min-h-screen bg-[#0B0D10] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),rgba(0,0,0,0.85))]" />
      </div>

      <div className="relative flex min-h-screen">
        <div className="flex-1 p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold">Venta #{id}</h1>
              <div className="mt-2 text-sm text-white/55">
                Rol:{" "}
                <span className="text-white/85 font-semibold">{user?.rol}</span>
              </div>
            </div>

            <button
              onClick={() => router.back()}
              className="px-4 py-2 rounded-xl border border-white/10 text-white/80 hover:bg-white/5"
            >
              ← Volver
            </button>
          </div>

          {/* Estado */}
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
              Cargando información...
            </div>
          ) : pageErr ? (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
              {pageErr}
            </div>
          ) : (
            <>
              {/* Venta */}
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-black/25 flex items-center justify-between">
                  <div className="text-white/80 font-semibold">Datos de la venta</div>
                  <span
                    className={[
                      "px-3 py-1 rounded-full border text-xs font-semibold",
                      venta?.estado_revision === "aprobada"
                        ? "bg-emerald-500/15 border-emerald-400/20 text-emerald-200"
                        : venta?.estado_revision === "rechazada"
                        ? "bg-red-500/15 border-red-400/20 text-red-200"
                        : "bg-white/5 border-white/10 text-white/70",
                    ].join(" ")}
                  >
                    {venta?.estado_revision ?? "—"}
                  </span>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/70">
                  <div>
                    <div className="text-white/40 text-xs mb-1">Cliente</div>
                    <div className="text-white/85 font-semibold">{venta?.nombre ?? "—"}</div>
                    <div className="text-white/55">{venta?.correo ?? "—"}</div>
                  </div>

                  <div>
                    <div className="text-white/40 text-xs mb-1">Contacto</div>
                    <div className="text-white/80">Tel: {venta?.telefono ?? "—"}</div>
                    <div className="text-white/55 text-xs">Extra: {venta?.telefono_extra ?? "—"}</div>
                  </div>

                  <div>
                    <div className="text-white/40 text-xs mb-1">Producto</div>
                    <div className="text-white/80">
                      {venta?.tipo_producto ?? "—"} · {venta?.meses ?? "—"}m
                    </div>

                    {/* ✅ Interés editable solo admin/spa */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="text-white/55 text-xs">Interés:</div>

                      <input
                        value={interesEdit}
                        onChange={(e) => {
                          setInteresErr("");
                          setInteresEdit(e.target.value);
                        }}
                        disabled={!adminCanEdit}
                        type="number"
                        step="0.1"
                        min={0}
                        max={adminCanEdit ? 5 : 3.5}
                        className={[
                          "w-28 px-3 py-2 rounded-xl border border-white/10 bg-black/25 text-white focus:ring-2 focus:ring-sky-400/30 focus:outline-none",
                          !adminCanEdit ? "opacity-70 cursor-not-allowed" : "",
                        ].join(" ")}
                      />

                      <div className="text-white/55 text-xs">%</div>

                      {adminCanEdit && (
                        <button
                          onClick={saveInteres}
                          disabled={interesSaving}
                          className={[
                            "ml-2 px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-400/20 text-white font-semibold hover:bg-sky-500/30 transition",
                            interesSaving ? "opacity-60 cursor-not-allowed" : "",
                          ].join(" ")}
                        >
                          {interesSaving ? "Guardando..." : "Guardar"}
                        </button>
                      )}
                    </div>

                    {interesErr && (
                      <div className="mt-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-200 text-sm">
                        {interesErr}
                      </div>
                    )}

                    <div className="mt-2 text-white/55">
                      Monto: ${String(venta?.monto ?? "—")}
                    </div>
                  </div>

                  <div>
                    <div className="text-white/40 text-xs mb-1">Fechas</div>
                    <div className="text-white/80">Lead: {fmtDate(venta?.fecha_lead)}</div>
                    <div className="text-white/55">Venta: {fmtDate(venta?.fecha_venta)}</div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-white/40 text-xs mb-1">Relación</div>
                    <div className="text-white/70">
                      lead_id:{" "}
                      <span className="text-white/85 font-semibold">
                        {venta?.lead_id ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ DOCUMENTOS (ver/descargar/sobreescribir) */}
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-black/25">
                  <div className="text-white/80 font-semibold">Documentos de la venta</div>
                  <div className="text-white/50 text-xs mt-1">
                    Puedes previsualizar, descargar y reemplazar (sobreescribir).
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  {docErr && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-200 text-sm">
                      {docErr}
                    </div>
                  )}

                  {docItems.map((it) => {
                    const urlKey = `${it.field}_url` as keyof Venta;
                    const pidKey = `${it.field}_public_id` as keyof Venta;

                    const url = (venta?.[urlKey] as string | null | undefined) ?? null;
                    const pid = (venta?.[pidKey] as string | null | undefined) ?? null;

                    const hasFile = !!url;

                    return (
                      <div
                        key={it.field}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-white/85 font-semibold">{it.label}</div>
                            <div className={hasFile ? "text-emerald-300 text-xs" : "text-red-300 text-xs"}>
                              {hasFile ? "✔ Cargado" : "✘ Pendiente"}
                            </div>
                            {hasFile && (
                              <div className="mt-2 text-xs text-white/50 break-all">
                                {url}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {hasFile && (
                              <>
                                <a
                                  href={url!}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs border border-white/10"
                                >
                                  Previsualizar
                                </a>
                                <button
                                  type="button"
                                  onClick={() => downloadFile(url!)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs border border-white/10"
                                >
                                  Descargar
                                </button>
                              </>
                            )}

                            {/* ✅ Sobreescribir */}
                            <label className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-white text-xs border border-sky-400/20 cursor-pointer">
                              {uploadingDoc[it.field] ? "Subiendo..." : hasFile ? "Reemplazar" : "Subir"}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) uploadDoc(f, it.field);
                                  e.currentTarget.value = "";
                                }}
                                disabled={!!uploadingDoc[it.field]}
                              />
                            </label>
                          </div>
                        </div>

                        {/* debug opcional */}
                        {pid ? (
                          <div className="mt-2 text-[11px] text-white/35 break-all">
                            public_id: {pid}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lead */}
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-black/25">
                  <div className="text-white/80 font-semibold">Datos del lead</div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/70">
                  <div>
                    <div className="text-white/40 text-xs mb-1">Nombre</div>
                    <div className="text-white/85 font-semibold">
                      {(lead?.nombre ?? "—") + (lead?.apellido ? ` ${lead.apellido}` : "")}
                    </div>
                  </div>

                  <div>
                    <div className="text-white/40 text-xs mb-1">Origen / Estado</div>
                    <div className="text-white/80">{lead?.origen ?? "—"}</div>
                    <div className="text-white/55">{lead?.estado ?? "—"}</div>
                  </div>

                  <div>
                    <div className="text-white/40 text-xs mb-1">Contacto</div>
                    <div className="text-white/80">{lead?.correo ?? "—"}</div>
                    <div className="text-white/55">Tel: {lead?.telefono ?? "—"}</div>
                  </div>

                  <div>
                    <div className="text-white/40 text-xs mb-1">País</div>
                    <div className="text-white/80">
                      {lead?.pais ?? "—"} {lead?.codigo_pais ? `(${lead.codigo_pais})` : ""}
                    </div>
                  </div>

                  <div>
                    <div className="text-white/40 text-xs mb-1">Inversión</div>
                    <div className="text-white/80">Meses: {lead?.meses_inversion ?? "—"}</div>
                    <div className="text-white/55">Monto: ${String(lead?.monto_inversion ?? "—")}</div>
                  </div>

                  <div>
                    <div className="text-white/40 text-xs mb-1">Fecha lead</div>
                    <div className="text-white/80">{fmtDate(lead?.fecha ?? null)}</div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-black/25 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-white/80 font-semibold">Notas</div>
                    <div className="text-white/50 text-xs">
                      Total: <span className="text-white/80 font-semibold">{notes.length}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setNoteErr("");
                      setShowNoteForm((v) => !v);
                    }}
                    className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/20 text-white font-semibold hover:bg-emerald-500/30 transition"
                  >
                    {showNoteForm ? "Cerrar" : "Agregar nota"}
                  </button>
                </div>

                {showNoteForm && (
                  <div className="p-4 border-b border-white/10 bg-black/20">
                    <label className="block text-white/70 text-xs mb-2">Nueva nota</label>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-black/25 text-white focus:ring-2 focus:ring-emerald-400/30 focus:outline-none"
                      placeholder="Escribe el seguimiento, estatus, próximo paso, etc..."
                    />

                    {noteErr && (
                      <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-200 text-sm">
                        {noteErr}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowNoteForm(false);
                          setNoteText("");
                          setNoteErr("");
                        }}
                        className="px-4 py-2 rounded-xl border border-white/10 text-white/80 hover:bg-white/5"
                        disabled={noteSaving}
                      >
                        Cancelar
                      </button>

                      <button
                        onClick={handleAddNote}
                        disabled={noteSaving}
                        className={[
                          "px-5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/20 text-white font-semibold hover:bg-emerald-500/30 transition",
                          noteSaving ? "opacity-60 cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        {noteSaving ? "Guardando..." : "Guardar nota"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-6">
                  {notes.length === 0 ? (
                    <div className="text-white/50">No hay notas todavía.</div>
                  ) : (
                    <div className="space-y-4">
                      {notes.map((n, idx) => {
                        const when = n.creado_en ?? n.fecha_hora ?? null;
                        const txt = pickNoteText(n) || "(Sin contenido)";
                        return (
                          <div
                            key={String(n.id ?? idx)}
                            className="rounded-2xl border border-white/10 bg-black/25 p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-white/40 text-xs">{fmtDate(when)}</div>
                              <div className="text-white/40 text-xs">
                                Autor:{" "}
                                <span className="text-white/70 font-semibold">
                                  {n.autor_id ?? n.asesor_id ?? "—"}
                                </span>
                              </div>
                            </div>

                            <div className="mt-2 text-white/85 text-sm whitespace-pre-wrap">
                              {txt}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="mt-8 h-px w-full bg-emerald-500/15" />
        </div>
      </div>
    </div>
  );
}