"use client";

import { useState } from "react";
import { downloadFile } from "../utils/downloadFile";

export type DocData = {
  url: string;
  public_id: string;
};

export type DocField =
  | "doc_cedula"
  | "doc_licencia"
  | "doc_servicio_basico"
  | "doc_certificado_bancario"
  | "doc_comprobante_fondeo"
  | "doc_solicitud_firmada"
  | "doc_cotizacion_inversion";

export function VentaDocItem({
  label,
  leadId,
  field,
  value,
  onChange,
}: {
  label: string;
  leadId: number;
  field: DocField;
  value: DocData | null;
  onChange: (next: DocData | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const uploaded = !!(value?.url && value?.public_id);

  const upload = async (file: File) => {
    setErr("");
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("field", field);
      fd.append("leadId", String(leadId));

      const res = await fetch("/api/lead-efectivos/upload-doc", {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setErr(data?.error || data?.message || "No se pudo subir.");
        return;
      }

      const url = String(data.url || "").trim();
      const public_id = String(data.public_id || "").trim();

      if (!url || !public_id) {
        setErr("Subida inválida: url/public_id vacíos.");
        return;
      }

      onChange({ url, public_id });
    } catch (e: any) {
      console.error(e);
      setErr("Error inesperado subiendo.");
    } finally {
      setUploading(false);
    }
  };

  // Si quieres borrar de Cloudinary, necesitas tu endpoint delete-doc.
  // Si todavía no lo tienes, por ahora solo limpiamos en UI.
  const clearLocal = () => onChange(null);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-white">{label}</p>
        {uploading && <span className="text-xs text-blue-300">Subiendo...</span>}
      </div>

      <p className={uploaded ? "text-emerald-300 text-xs" : "text-red-300 text-xs"}>
        {uploaded ? "✔ Documento cargado" : "✘ Pendiente"}
      </p>

      {uploaded && value?.url && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/70 break-all">
          {value.url}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {uploaded && value?.url && (
          <>
            <button
              type="button"
              onClick={() => downloadFile(value.url)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs border border-white/10"
            >
              Descargar
            </button>

            <a
              href={value.url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs border border-white/10"
            >
              Previsualizar
            </a>

            <button
              type="button"
              onClick={clearLocal}
              className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs border border-white/10"
            >
              Quitar
            </button>
          </>
        )}

        <label className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs border border-white/10 cursor-pointer ml-auto">
          {uploaded ? "Reemplazar" : "Subir archivo"}
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => e.target.files && upload(e.target.files[0])}
            className="hidden"
          />
        </label>
      </div>

      {err && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-200 text-xs">
          {err}
        </div>
      )}
    </div>
  );
}