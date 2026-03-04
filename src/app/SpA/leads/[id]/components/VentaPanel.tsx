"use client";

import { useMemo } from "react";
import type { Lead, TipoProducto } from "../types";
import { VentaDocItem } from "./VentaDocItem";

// ✅ Por si no tienes el tipo exportado desde el hook o se te rompe el import
export type DocData = {
  url: string;
  public_id: string;
};

export type VentaDocs = {
  doc_cedula: DocData | null;
  doc_licencia: DocData | null;
  doc_servicio_basico: DocData | null;
  doc_certificado_bancario: DocData | null;
  doc_comprobante_fondeo: DocData | null;
  doc_solicitud_firmada: DocData | null;
  doc_cotizacion_inversion: DocData | null;
};

export function VentaPanel({
  open,
  onClose,
  lead,
  asignado,
  fechaFmt,
  leadFullName,

  telefonoExtra,
  setTelefonoExtra,

  tipoProducto,
  setTipoProducto,
  reglas,

  meses,
  setMeses,
  monto,
  setMonto,
  interes,
  setInteres,

  fechaVenta,
  setFechaVenta,

  docs,
  setDocs,

  ventaError,
  savingVenta,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  lead: Lead;
  asignado: string;
  fechaFmt: string | null;
  leadFullName: string;

  telefonoExtra: string;
  setTelefonoExtra: (v: string) => void;

  tipoProducto: TipoProducto;
  setTipoProducto: (v: TipoProducto) => void;
  reglas: {
    mesesOptions: number[];
    minMonto: number;
    interesFijo: boolean;
    interesMin: number;
    interesMax: number; // plazo fijo 3.5
  };

  meses: number;
  setMeses: (v: number) => void;
  monto: number;
  setMonto: (v: number) => void;
  interes: number;
  setInteres: (v: number) => void;

  fechaVenta: string;
  setFechaVenta: (v: string) => void;

  docs: VentaDocs;
  setDocs: (next: VentaDocs) => void;

  ventaError: string;
  savingVenta: boolean;
  onSubmit: () => void;
}) {
  const canSubmit = useMemo(() => {
    const montoNum = Number(monto);
    const interesNum = Number(interes);

    if (!Number.isFinite(montoNum) || montoNum < reglas.minMonto) return false;
    if (!fechaVenta) return false;

    if (!reglas.interesFijo) {
      if (
        !Number.isFinite(interesNum) ||
        interesNum < reglas.interesMin ||
        interesNum > reglas.interesMax
      )
        return false;
    }

    const allDocsOk =
      !!docs.doc_cedula &&
      !!docs.doc_licencia &&
      !!docs.doc_servicio_basico &&
      !!docs.doc_certificado_bancario &&
      !!docs.doc_comprobante_fondeo &&
      !!docs.doc_solicitud_firmada &&
      !!docs.doc_cotizacion_inversion;

    return allDocsOk;
  }, [monto, interes, fechaVenta, reglas, docs]);

  return (
    <div
      className={[
        "fixed top-0 right-0 h-full w-full sm:w-[520px] z-50 transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
    >
      {/* Overlay */}
      <div
        className={[
          "fixed inset-0 bg-black/60 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] border-l border-white/10 bg-[#0B0D10]/95 backdrop-blur-2xl shadow-2xl p-6 overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-bold text-white">Venta</h3>
            <p className="text-white/50 text-sm mt-1">
              Completa los datos y sube documentos para enviar.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl border border-white/10 text-white/80 hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>

        {/* Auto info */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-white/85">
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-white/60">Nombre:</span>{" "}
              <span className="text-white/90 font-semibold">{leadFullName}</span>
            </p>
            <p>
              <span className="text-white/60">Correo:</span>{" "}
              <span className="text-white/90 font-semibold">{lead.correo}</span>
            </p>
            <p>
              <span className="text-white/60">Teléfono:</span>{" "}
              <span className="text-white/90 font-semibold">
                {`${lead.codigo_pais || ""} ${lead.telefono || ""}`.trim() || "—"}
              </span>
            </p>
            <p>
              <span className="text-white/60">País:</span>{" "}
              <span className="text-white/90 font-semibold">{lead.pais || "—"}</span>
            </p>
            <p>
              <span className="text-white/60">Asignado a:</span>{" "}
              <span className="text-white/90 font-semibold">{asignado}</span>
            </p>
            <p>
              <span className="text-white/60">Fecha lead:</span>{" "}
              <span className="text-white/90 font-semibold">{fechaFmt || "—"}</span>
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">
                Teléfono extra (opcional)
              </label>
              <input
                value={telefonoExtra}
                onChange={(e) => setTelefonoExtra(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/25 text-white placeholder:text-white/40 focus:ring-2 focus:ring-sky-400/30 focus:outline-none"
                placeholder="Ej: +507 69998877"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Producto</label>
              <select
                value={tipoProducto}
                onChange={(e) => setTipoProducto(e.target.value as TipoProducto)}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/25 text-white focus:ring-2 focus:ring-sky-400/30 focus:outline-none"
              >
                <option value="plazo_fijo" className="bg-[#0B0D10] text-white">
                  Plazo fijo
                </option>
                <option value="profuturo" className="bg-[#0B0D10] text-white">
                  Profuturo
                </option>
              </select>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Meses</label>
              <select
                value={meses}
                onChange={(e) => setMeses(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/25 text-white focus:ring-2 focus:ring-sky-400/30 focus:outline-none"
              >
                {reglas.mesesOptions.map((m) => (
                  <option key={m} value={m} className="bg-[#0B0D10] text-white">
                    {m} {m === 12 ? "(1 año)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">
                Monto (mínimo {reglas.minMonto})
              </label>
              <input
                type="number"
                min={reglas.minMonto}
                step="1"
                value={monto}
                onChange={(e) => setMonto(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/25 text-white focus:ring-2 focus:ring-sky-400/30 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">
                Interés {reglas.interesFijo ? "(fijo)" : "(1% a 3.5%)"}
              </label>
              <input
                type="number"
                min={reglas.interesMin}
                max={reglas.interesMax}
                step="0.1"
                value={interes}
                disabled={reglas.interesFijo}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v)) return;
                  if (v < reglas.interesMin) setInteres(reglas.interesMin);
                  else if (v > reglas.interesMax) setInteres(reglas.interesMax);
                  else setInteres(v);
                }}
                className={[
                  "w-full px-4 py-3 rounded-xl border border-white/10 bg-black/25 text-white focus:ring-2 focus:ring-sky-400/30 focus:outline-none",
                  reglas.interesFijo ? "opacity-70 cursor-not-allowed" : "",
                ].join(" ")}
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Fecha de venta</label>
              <input
                type="datetime-local"
                value={fechaVenta}
                onChange={(e) => setFechaVenta(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/25 text-white focus:ring-2 focus:ring-sky-400/30 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* DOCUMENTOS */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h4 className="text-white font-bold text-lg">Documentos</h4>
          <p className="text-white/50 text-sm mt-1">
            Debes subir todos para poder enviar.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <VentaDocItem
              label="Copia de cédula"
              leadId={lead.id}
              field="doc_cedula"
              value={docs.doc_cedula}
              onChange={(v) => setDocs({ ...docs, doc_cedula: v })}
            />
            <VentaDocItem
              label="Copia de licencia"
              leadId={lead.id}
              field="doc_licencia"
              value={docs.doc_licencia}
              onChange={(v) => setDocs({ ...docs, doc_licencia: v })}
            />
            <VentaDocItem
              label="Servicio básico"
              leadId={lead.id}
              field="doc_servicio_basico"
              value={docs.doc_servicio_basico}
              onChange={(v) => setDocs({ ...docs, doc_servicio_basico: v })}
            />
            <VentaDocItem
              label="Certificado bancario"
              leadId={lead.id}
              field="doc_certificado_bancario"
              value={docs.doc_certificado_bancario}
              onChange={(v) => setDocs({ ...docs, doc_certificado_bancario: v })}
            />
            <VentaDocItem
              label="Comprobante de fondeo"
              leadId={lead.id}
              field="doc_comprobante_fondeo"
              value={docs.doc_comprobante_fondeo}
              onChange={(v) => setDocs({ ...docs, doc_comprobante_fondeo: v })}
            />
            <VentaDocItem
              label="Solicitud firmada"
              leadId={lead.id}
              field="doc_solicitud_firmada"
              value={docs.doc_solicitud_firmada}
              onChange={(v) => setDocs({ ...docs, doc_solicitud_firmada: v })}
            />
            <VentaDocItem
              label="Cotización inversión"
              leadId={lead.id}
              field="doc_cotizacion_inversion"
              value={docs.doc_cotizacion_inversion}
              onChange={(v) => setDocs({ ...docs, doc_cotizacion_inversion: v })}
            />
          </div>
        </div>

        {ventaError && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-200 text-sm">
            {ventaError}
          </div>
        )}

        <button
          onClick={onSubmit}
          disabled={savingVenta || !canSubmit}
          className={[
            "mt-6 w-full px-5 py-3 rounded-full bg-sky-500/20 border border-sky-400/20 text-white font-semibold hover:bg-sky-500/30 transition",
            savingVenta || !canSubmit ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
        >
          {savingVenta
            ? "Enviando..."
            : !canSubmit
            ? "Completa todo para enviar"
            : "Enviar solicitud"}
        </button>

        <div className="mt-4 text-xs text-white/40">
          * Esto enviará la venta a <span className="text-white/60">/api/lead-efectivos</span>.
        </div>
      </div>
    </div>
  );
}