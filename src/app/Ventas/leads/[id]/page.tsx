"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Sidebar from "../components/Sidebar";

import { useAuthGuard } from "./hooks/useAuthGuard";
import { useLeadData } from "./hooks/useLeadData";
import { useVentaForm } from "./hooks/useVentaForm";

import { formatFechaES } from "./utils/date";
import { LeadHeader } from "./components/LeadHeader";
import { LeadInfoCards } from "./components/LeadInfoCards";
import { NotesSection } from "./components/NotesSection";
import { VentaPanel } from "./components/VentaPanel";

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = Array.isArray(params.id) ? params.id[0] : (params.id as string | undefined);
  const router = useRouter();

  const { validando, usuario } = useAuthGuard();
  const { lead, notes, loading, changeEstado, postNote } = useLeadData(leadId, usuario);

  const [noteText, setNoteText] = useState("");

  const venta = useVentaForm();

  if (validando)
    return (
      <div className="flex justify-center items-center h-screen text-white">
        Validando acceso...
      </div>
    );

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-white/70">
        Cargando...
      </div>
    );

  if (!lead)
    return (
      <div className="flex justify-center items-center h-screen text-red-400">
        Lead no encontrado
      </div>
    );

  const asignado =
    lead?.nombre_asesor?.trim()
      ? lead.nombre_asesor
      : lead?.asignado_a
      ? `Usuario #${lead.asignado_a}`
      : "Sin asignar";

  const fechaFmt = formatFechaES(lead.fecha);
  const leadFullName = `${lead.nombre} ${lead.apellido || ""}`.trim();

  const handleChangeEstado = async (nuevoEstado: string) => {
    const r = await changeEstado(nuevoEstado);
    if (!r.ok) return;

    if (nuevoEstado === "venta") venta.setVentaOpen(true);
    else venta.setVentaOpen(false);
  };

  const handlePostNote = async () => {
    if (!noteText.trim()) return;
    const ok = await postNote(noteText.trim());
    if (ok) setNoteText("");
  };

  const handleSubmitVenta = async () => {
    await venta.submitVenta(lead, leadFullName);
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `url(/fondobg.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex min-h-screen bg-black/55">
        <Sidebar />

        <div className="flex-1 p-6 relative">
          <div className="mx-auto w-full max-w-5xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden">
            <LeadHeader
              lead={lead}
              fechaFmt={fechaFmt}
              onEstadoChange={handleChangeEstado}
              onOpenVenta={() => venta.setVentaOpen(true)}
            />

            <div className="p-6">
              <LeadInfoCards lead={lead} asignado={asignado} />

              <NotesSection
                noteText={noteText}
                setNoteText={setNoteText}
                onSave={handlePostNote}
                notes={notes}
              />
            </div>
          </div>

          <VentaPanel
            open={venta.ventaOpen}
            onClose={() => venta.setVentaOpen(false)}
            lead={lead}
            asignado={asignado}
            fechaFmt={fechaFmt}
            leadFullName={leadFullName}
            telefonoExtra={venta.telefonoExtra}
            setTelefonoExtra={venta.setTelefonoExtra}
            tipoProducto={venta.tipoProducto}
            setTipoProducto={venta.setTipoProducto}
            reglas={venta.reglas}
            meses={venta.meses}
            setMeses={venta.setMeses}
            monto={venta.monto}
            setMonto={venta.setMonto}
            interes={venta.interes}
            setInteres={venta.setInteres}
            fechaVenta={venta.fechaVenta}
            setFechaVenta={venta.setFechaVenta}
            ventaError={venta.ventaError}
            savingVenta={venta.savingVenta}
            onSubmit={handleSubmitVenta}

            // ✅ ESTO ES LO QUE FALTABA
            docs={venta.docs}
            setDocs={venta.setDocs}
          />
        </div>
      </div>
    </div>
  );
}