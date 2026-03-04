"use client";

import type { Lead } from "../types";

export function LeadHeader({
  lead,
  fechaFmt,
  onEstadoChange,
  onOpenVenta,
}: {
  lead: Lead;
  fechaFmt: string | null;
  onEstadoChange: (v: string) => void;
  onOpenVenta: () => void;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-6 border-b border-white/10 bg-black/25">
      <div>
        <h2 className="text-3xl font-bold text-white">
          {lead.nombre} {lead.apellido || ""}
        </h2>
        <div className="text-sm text-white/60 mt-1">
          {fechaFmt ? (
            <>
              Fecha: <span className="text-white/85 font-semibold">{fechaFmt}</span>
            </>
          ) : (
            <>
              Fecha: <span className="text-white/40">—</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-white/70 font-semibold">Estado:</span>
        <select
          value={lead.estado}
          onChange={(e) => onEstadoChange(e.target.value)}
          className={[
            "px-4 py-2 rounded-full font-semibold text-sm outline-none border",
            lead.estado === "pendiente"
              ? "bg-yellow-500/20 text-yellow-100 border-yellow-400/20"
              : lead.estado === "contactado"
              ? "bg-amber-500/20 text-amber-100 border-amber-400/20"
              : lead.estado === "cerrado"
              ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/20"
              : "bg-sky-500/20 text-sky-100 border-sky-400/20",
          ].join(" ")}
        >
          <option value="pendiente" className="bg-[#0B0D10] text-white">
            Pendiente
          </option>
          <option value="contactado" className="bg-[#0B0D10] text-white">
            Contactado
          </option>
          <option value="cerrado" className="bg-[#0B0D10] text-white">
            Cerrado
          </option>
          <option value="venta" className="bg-[#0B0D10] text-white">
            Venta
          </option>
        </select>

        {lead.estado === "venta" && (
          <button
            onClick={onOpenVenta}
            className="ml-2 px-4 py-2 rounded-full bg-sky-500/20 border border-sky-400/20 text-white font-semibold hover:bg-sky-500/30 transition"
          >
            Ver venta
          </button>
        )}
      </div>
    </div>
  );
}