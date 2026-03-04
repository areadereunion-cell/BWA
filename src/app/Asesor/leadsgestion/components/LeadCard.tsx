"use client";
import { useRouter } from "next/navigation";

interface LeadCardProps {
  lead?: {
    id?: number;
    nombre?: string;
    telefono?: string;
    estado?: "Nuevo" | "Contactado" | "En Proceso" | "Cerrado";
    correo?: string;
    empresa?: string;
    [key: string]: any;
  };
}

export default function LeadCard({ lead }: LeadCardProps) {
  const router = useRouter();

  if (!lead) return null;

  const nombre = lead.nombre || "Sin nombre";
  const telefono = lead.telefono || "Sin teléfono";
  const estado = lead.estado || "Nuevo";
  const correo = lead.correo || "";
  const empresa = lead.empresa || "";

  const estadoColor: Record<string, string> = {
    Nuevo: "bg-blue-400/40 text-blue-800",
    Contactado: "bg-yellow-400/40 text-yellow-800",
    "En Proceso": "bg-purple-400/40 text-purple-800",
    Cerrado: "bg-green-400/40 text-green-800",
  };

  return (
    <div className="flip-card">
      <div className="flip-card-inner">
        
        {/* FRONT */}
        <div className="flip-card-front">
          <h2 className="title">{nombre}</h2>
          {empresa && <p className="text-sm mt-1">{empresa}</p>}
          <p className="text-sm mt-2">Teléfono: {telefono}</p>
          {correo && <p className="text-sm">{correo}</p>}

          <span
            className={`inline-block px-2 py-1 mt-4 rounded-full text-xs font-semibold ${
              estadoColor[estado]
            }`}
          >
            {estado}
          </span>
        </div>

        {/* BACK */}
        <div className="flip-card-back">
          <h2 className="title">Ver Lead</h2>

          <button
            className="mt-4 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            onClick={() => lead.id && router.push(`/leads/${lead.id}`)}
          >
            Detalles
          </button>
        </div>
            
      </div>
    </div>
  );
}
