"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lead, TipoProducto } from "../types";
import { getReglasProducto } from "../utils/productRules";
import { toDatetimeLocalValue } from "../utils/date";

export type DocData = {
  url: string;
  public_id: string;
  resource_type?: string;
  original_filename?: string;
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

export const emptyDocs: VentaDocs = {
  doc_cedula: null,
  doc_licencia: null,
  doc_servicio_basico: null,
  doc_certificado_bancario: null,
  doc_comprobante_fondeo: null,
  doc_solicitud_firmada: null,
  doc_cotizacion_inversion: null,
};

function allDocsOk(d: VentaDocs) {
  return (
    !!d.doc_cedula &&
    !!d.doc_licencia &&
    !!d.doc_servicio_basico &&
    !!d.doc_certificado_bancario &&
    !!d.doc_comprobante_fondeo &&
    !!d.doc_solicitud_firmada &&
    !!d.doc_cotizacion_inversion
  );
}

export function useVentaForm() {
  const [ventaOpen, setVentaOpen] = useState(false);

  // ✅ docs (cloudinary url/public_id)
  const [docs, setDocs] = useState<VentaDocs>(emptyDocs);

  const [tipoProducto, setTipoProducto] = useState<TipoProducto>("plazo_fijo");
  const reglas = useMemo(() => getReglasProducto(tipoProducto), [tipoProducto]);

  const [meses, setMeses] = useState<number>(12);
  const [monto, setMonto] = useState<number>(2000);
  const [interes, setInteres] = useState<number>(1);
  const [telefonoExtra, setTelefonoExtra] = useState<string>("");

  const [fechaVenta, setFechaVenta] = useState<string>(() =>
    toDatetimeLocalValue(new Date())
  );

  const [savingVenta, setSavingVenta] = useState(false);
  const [ventaError, setVentaError] = useState<string>("");

  useEffect(() => {
    setVentaError("");
    setMeses(reglas.mesesOptions[0]);

    setMonto((prev) => {
      const next = Number.isFinite(prev) ? prev : reglas.minMonto;
      return next < reglas.minMonto ? reglas.minMonto : next;
    });

    if (reglas.interesFijo) setInteres(reglas.interesMax);
    else {
      setInteres((prev) => {
        const next = Number.isFinite(prev) ? prev : reglas.interesMin;
        if (next < reglas.interesMin) return reglas.interesMin;
        if (next > reglas.interesMax) return reglas.interesMax;
        return next;
      });
    }
  }, [reglas]);

  async function submitVenta(lead: Lead, leadFullName: string) {
    setVentaError("");

    // ✅ Bloqueo docs
    if (!allDocsOk(docs)) {
      setVentaError("Debes subir todos los documentos antes de enviar la solicitud.");
      return false;
    }

    const montoNum = Number(monto);
    const interesNum = Number(interes);

    if (!Number.isFinite(montoNum) || montoNum < reglas.minMonto) {
      setVentaError(`El monto mínimo para este producto es ${reglas.minMonto}.`);
      return false;
    }

    if (!fechaVenta) {
      setVentaError("Selecciona la fecha de venta.");
      return false;
    }

    if (!reglas.interesFijo) {
      if (
        !Number.isFinite(interesNum) ||
        interesNum < reglas.interesMin ||
        interesNum > reglas.interesMax
      ) {
        setVentaError(
          `El interés debe estar entre ${reglas.interesMin}% y ${reglas.interesMax}%.`
        );
        return false;
      }
    }

    const payload = {
      lead_id: lead.id,
      nombre: leadFullName,
      correo: lead.correo,
      telefono: `${lead.codigo_pais || ""} ${lead.telefono || ""}`.trim(),
      telefono_extra: telefonoExtra?.trim() || null,
      pais: lead.pais || null,
      asignado_a: lead.asignado_a ?? null,

      tipo_producto: tipoProducto,
      meses,
      monto: montoNum,
      interes: reglas.interesFijo ? reglas.interesMax : interesNum,

      fecha_lead: lead.fecha ? new Date(lead.fecha).toISOString().slice(0, 10) : null,
      fecha_venta: new Date(fechaVenta).toISOString(),

      // ✅ docs url/public_id
      doc_cedula_url: docs.doc_cedula!.url,
      doc_cedula_public_id: docs.doc_cedula!.public_id,

      doc_licencia_url: docs.doc_licencia!.url,
      doc_licencia_public_id: docs.doc_licencia!.public_id,

      doc_servicio_basico_url: docs.doc_servicio_basico!.url,
      doc_servicio_basico_public_id: docs.doc_servicio_basico!.public_id,

      doc_certificado_bancario_url: docs.doc_certificado_bancario!.url,
      doc_certificado_bancario_public_id: docs.doc_certificado_bancario!.public_id,

      doc_comprobante_fondeo_url: docs.doc_comprobante_fondeo!.url,
      doc_comprobante_fondeo_public_id: docs.doc_comprobante_fondeo!.public_id,

      doc_solicitud_firmada_url: docs.doc_solicitud_firmada!.url,
      doc_solicitud_firmada_public_id: docs.doc_solicitud_firmada!.public_id,

      doc_cotizacion_inversion_url: docs.doc_cotizacion_inversion!.url,
      doc_cotizacion_inversion_public_id: docs.doc_cotizacion_inversion!.public_id,
    };

    try {
      setSavingVenta(true);

      const res = await fetch("/api/lead-efectivos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setVentaError(data?.message || "No se pudo guardar la venta.");
        return false;
      }

      setVentaOpen(false);
      setVentaError("");
      return true;
    } catch (e) {
      console.error(e);
      setVentaError("Error inesperado guardando la venta.");
      return false;
    } finally {
      setSavingVenta(false);
    }
  }

  return {
    ventaOpen,
    setVentaOpen,

    docs,
    setDocs,

    tipoProducto,
    setTipoProducto,
    reglas,

    meses,
    setMeses,
    monto,
    setMonto,
    interes,
    setInteres,

    telefonoExtra,
    setTelefonoExtra,

    fechaVenta,
    setFechaVenta,

    savingVenta,
    ventaError,
    setVentaError,

    submitVenta,
  };
}