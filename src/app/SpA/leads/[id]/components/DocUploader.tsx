"use client";

import { useRef, useState } from "react";
import type { DocFile } from "../hooks/useVentaForm";

export function DocUploader({
  label,
  value,
  onChange,
  folder,
  autoDeletePrevious = false,
}: {
  label: string;
  value: DocFile | null;
  onChange: (next: DocFile | null) => void;
  folder: string; // ej: crm/leads/123/cedula
  autoDeletePrevious?: boolean; // si quieres borrar anterior automáticamente al reemplazar
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function deleteFromCloudinary(file: DocFile) {
    await fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ public_id: file.public_id, resource_type: file.resource_type }),
    });
  }

  async function uploadFile(file: File) {
    setErr("");
    setBusy(true);

    try {
      // 1) pedir firma
      const signRes = await fetch("/api/cloudinary/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ folder }),
      });

      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign?.error || "No se pudo firmar");

      // 2) decidir resource_type
      const isPdf = file.type === "application/pdf";
      const resource_type: "image" | "raw" = isPdf ? "raw" : "image";

      const uploadUrl = `https://api.cloudinary.com/v1_1/${sign.cloudName}/${resource_type}/upload`;

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sign.apiKey);
      form.append("timestamp", String(sign.timestamp));
      form.append("signature", sign.signature);
      form.append("folder", sign.folder);

      const upRes = await fetch(uploadUrl, { method: "POST", body: form });
      const data = await upRes.json();
      if (!upRes.ok) throw new Error(data?.error?.message || "Error subiendo archivo");

      const next: DocFile = {
        url: data.secure_url,
        public_id: data.public_id,
        resource_type,
        original_filename: data.original_filename,
      };

      // opcional: borrar anterior al reemplazar
      if (autoDeletePrevious && value?.public_id) {
        try {
          await deleteFromCloudinary(value);
        } catch {}
      }

      onChange(next);
    } catch (e: any) {
      setErr(e?.message || "Error subiendo archivo");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!value?.public_id) return;
    setErr("");
    setBusy(true);

    try {
      const delRes = await fetch("/api/cloudinary/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ public_id: value.public_id, resource_type: value.resource_type }),
      });

      const del = await delRes.json();
      if (!delRes.ok) throw new Error(del?.error || "No se pudo borrar");

      onChange(null);
    } catch (e: any) {
      setErr(e?.message || "Error borrando");
    } finally {
      setBusy(false);
    }
  }

  const ok = !!value;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-white font-semibold">{label}</p>
          <p className="text-xs text-white/50">Sube imagen o PDF.</p>
        </div>

        <span
          className={[
            "text-xs font-semibold px-3 py-1 rounded-full border",
            ok
              ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/20"
              : "bg-yellow-500/15 text-yellow-200 border-yellow-400/20",
          ].join(" ")}
        >
          {ok ? "Listo" : "Pendiente"}
        </span>
      </div>

      {value ? (
        <div className="mt-3">
          {value.resource_type === "image" ? (
            <img
              src={value.url}
              alt={label}
              className="w-full rounded-xl border border-white/10 max-h-64 object-cover"
            />
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-white/80 text-sm">
              PDF: {value.original_filename || "archivo"}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={value.url}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl border border-white/10 text-white/85 hover:bg-white/5 text-sm"
            >
              Ver / Descargar
            </a>

            <button
              onClick={handleDelete}
              disabled={busy}
              className="px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/15 text-sm disabled:opacity-60"
            >
              {busy ? "..." : "Borrar"}
            </button>

            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="ml-auto px-4 py-2 rounded-xl border border-white/10 text-white/85 hover:bg-white/5 text-sm disabled:opacity-60"
            >
              {busy ? "Subiendo..." : "Reemplazar"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-3 w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white/85 hover:bg-white/10 text-sm disabled:opacity-60"
        >
          {busy ? "Subiendo..." : "Subir archivo"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadFile(f);
        }}
      />

      {err && (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-200 text-xs">
          {err}
        </div>
      )}
    </div>
  );
}