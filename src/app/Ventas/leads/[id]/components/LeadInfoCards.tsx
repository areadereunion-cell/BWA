"use client";

import type { Lead } from "../types";

export function LeadInfoCards({
  lead,
  asignado,
}: {
  lead: Lead;
  asignado: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/85">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
        <div className="space-y-2">
          <p>
            <span className="text-white/60">Correo:</span>{" "}
            <span className="text-white/90 font-semibold">{lead.correo || "—"}</span>
          </p>
          <p>
            <span className="text-white/60">Teléfono:</span>{" "}
            <span className="text-white/90 font-semibold">
              {lead.codigo_pais || ""} {lead.telefono || "—"}
            </span>
          </p>
          <p>
            <span className="text-white/60">País:</span>{" "}
            <span className="text-white/90 font-semibold">{lead.pais || "—"}</span>
          </p>
          <p>
            <span className="text-white/60">Origen:</span>{" "}
            <span className="text-white/90 font-semibold">{lead.origen || "—"}</span>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
        <div className="space-y-2">
          <p>
            <span className="text-white/60">Meses inversión:</span>{" "}
            <span className="text-white/90 font-semibold">
              {lead.meses_inversion ?? "—"}
            </span>
          </p>
          <p>
            <span className="text-white/60">Monto inversión:</span>{" "}
            <span className="text-white/90 font-semibold">
              ${lead.monto_inversion ?? "—"}
            </span>
          </p>
          <p>
            <span className="text-white/60">Asignado a:</span>{" "}
            <span className="text-white/90 font-semibold">{asignado}</span>
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
            <h3 className="text-xl font-bold text-white mb-3">Duda del cliente</h3>
            <div className="text-white/85 whitespace-pre-line">
              {lead.duda?.trim() ? lead.duda : "Sin mensaje"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}