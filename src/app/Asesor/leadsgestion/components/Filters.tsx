"use client";

import React from "react";

type Props = {
  filtroEstado: string;
  setFiltroEstado: React.Dispatch<React.SetStateAction<string>>;
  selectedLeads: number[];
  onAssignClick: () => void;
};

export default function Filters({
  filtroEstado,
  setFiltroEstado,
  selectedLeads,
  onAssignClick,
}: Props) {
  const estados = ["todos", "pendiente", "contactado", "cerrado"] as const;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-2">
        {estados.map((estado) => {
          const active = filtroEstado === estado;
          return (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={[
                "px-4 py-2 rounded-full text-sm font-semibold transition border",
                active
                  ? "bg-emerald-500/15 border-emerald-400/20 text-white"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              {estado}
            </button>
          );
        })}
      </div>

      <button
        onClick={onAssignClick}
        disabled={selectedLeads.length === 0}
        className={[
          "ml-auto px-4 py-2 rounded-full text-sm font-semibold transition border shadow-2xl",
          selectedLeads.length > 0
            ? "border-emerald-400/20 bg-emerald-500/15 text-white/90 hover:bg-emerald-500/25 hover:border-emerald-400/30"
            : "border-white/10 bg-white/5 text-white/40 cursor-not-allowed",
        ].join(" ")}
      >
        Asignar a usuario
      </button>
    </div>
  );
}
        