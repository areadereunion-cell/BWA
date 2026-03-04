"use client";

import React, { useEffect, useMemo, useState } from "react";
import LeadCard from "./components/LeadCard";
import Sidebar from "./components/Sidebar";

type EstadoLead = "Nuevo" | "Contactado" | "En Proceso" | "Cerrado";

interface Lead {
  id?: number;
  asignado_a?: number;
  origen?: string;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  correo?: string;

  estado?: EstadoLead | string | null;

  codigo_pais?: string;
  pais?: string;
  meses_inversion?: number;
  monto_inversion?: number;

  // ✅ fecha del lead (YYYY-MM-DD)
  fecha_lead?: string | null;

  // ✅ si en tu API viene alguna fecha
  fecha?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  fecha_creacion?: string | null;
  fechaCreacion?: string | null;

  empresa?: string;

  [key: string]: any;
}

type LeadCardLead = {
  [key: string]: any;
  id?: number;
  nombre?: string;
  telefono?: string;
  estado?: EstadoLead;
  correo?: string;
  empresa?: string;
};

const estadosFiltro = ["todos", "pendiente", "contactado", "cerrado"] as const;
type EstadoFiltro = (typeof estadosFiltro)[number];

// ---------------------------
// ✅ normaliza estado para LeadCard
// ---------------------------
function safeEstado(v: any): EstadoLead | undefined {
  const s = String(v ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\s+/g, " ");

  if (!s) return undefined;

  if (s === "nuevo" || s.includes("nuevo")) return "Nuevo";
  if (s === "contactado" || s === "contactada" || s.includes("contact"))
    return "Contactado";
  if (
    s === "en proceso" ||
    s.includes("proceso") ||
    s.includes("seguimiento") ||
    s.includes("negoci")
  )
    return "En Proceso";
  if (
    s === "cerrado" ||
    s === "cerrada" ||
    s.includes("cerrad") ||
    s.includes("closed") ||
    s.includes("won")
  )
    return "Cerrado";

  return undefined;
}

// ---------------------------
// ✅ helpers de filtro
// ---------------------------
type Cat = "nuevo" | "en_proceso" | "contactado" | "cerrado" | "otro";

function norm(v: any) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\s+/g, " ");
}

function categoriaEstado(estadoRaw: any): Cat {
  const s = norm(estadoRaw);

  if (
    s.includes("cerr") ||
    s.includes("closed") ||
    s.includes("won") ||
    s.includes("finaliz") ||
    s.includes("complet")
  )
    return "cerrado";

  if (
    s.includes("contact") ||
    s.includes("llamad") ||
    s.includes("respond") ||
    s.includes("respuesta") ||
    s.includes("interes")
  )
    return "contactado";

  if (s.includes("proceso") || s.includes("seguimiento") || s.includes("negoci"))
    return "en_proceso";
  if (s.includes("nuevo")) return "nuevo";

  return "otro";
}

// ✅ toma fecha desde el primer campo disponible
function getLeadDateRaw(l: any) {
  return (
    l?.fecha_lead ??
    l?.fecha ??
    l?.created_at ??
    l?.createdAt ??
    l?.fecha_creacion ??
    l?.fechaCreacion ??
    null
  );
}

// ✅ convertir a YYYY-MM-DD (sin UTC)
function toYMD(v: any) {
  if (!v) return "";
  const s = String(v).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ✅ HOY en YYYY-MM-DD (local, sin UTC)
function todayYMD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function LeadsGestion() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ✅ filtro estado
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>("todos");

  // ✅ filtros nuevos
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroCorreo, setFiltroCorreo] = useState("");
  const [filtroFecha, setFiltroFecha] = useState(""); // YYYY-MM-DD

  const [openForm, setOpenForm] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    correo: "",
    estado: "Nuevo" as EstadoLead,
    codigo_pais: "+593",
    pais: "Ecuador",
    meses_inversion: 0,
    monto_inversion: 0,
  });

  // ---------------------------
  // ✅ cargar leads
  // ---------------------------
  useEffect(() => {
    fetch("/api/leads/asesor", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        const data = await res.json().catch(() => ({}));
        const validLeads: Lead[] = (data.leads || []).filter(
          (lead: Lead) => lead && (lead.id || lead.nombre || lead.telefono)
        );

        setLeads(validLeads);
      })
      .catch(() => setError("Error cargando datos"))
      .finally(() => setLoading(false));
  }, []);

  // ---------------------------
  // ✅ filtro final (estado + nombre + correo + fecha)
  // ---------------------------
  const leadsFiltrados = useMemo(() => {
    const fNom = norm(filtroNombre);
    const fCor = norm(filtroCorreo);
    const fFecha = String(filtroFecha || "").trim();

    return leads.filter((lead) => {
      // estado
      const cat = categoriaEstado(lead.estado);
      const okEstado =
        filtroEstado === "todos"
          ? true
          : filtroEstado === "pendiente"
          ? cat === "nuevo" || cat === "en_proceso"
          : filtroEstado === "contactado"
          ? cat === "contactado"
          : filtroEstado === "cerrado"
          ? cat === "cerrado"
          : true;

      // nombre (nombre + apellido)
      const fullName = `${lead.nombre ?? ""} ${lead.apellido ?? ""}`.trim();
      const okNombre = !fNom ? true : norm(fullName).includes(fNom);

      // correo
      const okCorreo = !fCor ? true : norm(lead.correo).includes(fCor);

      // fecha exacta
      const raw = getLeadDateRaw(lead);
      const ymd = toYMD(raw);
      const okFecha = !fFecha ? true : ymd === fFecha;

      return okEstado && okNombre && okCorreo && okFecha;
    });
  }, [leads, filtroEstado, filtroNombre, filtroCorreo, filtroFecha]);

  // ---------------------------
  // ✅ crear lead
  // ---------------------------
  async function crearLead() {
    if (!form.nombre.trim() || !form.telefono.trim()) {
      alert("⚠ Nombre y Teléfono son obligatorios");
      return;
    }
    if ((form.codigo_pais || "").trim().length > 10) {
      alert("⚠ El código de país no puede superar 10 caracteres");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const fecha_lead = todayYMD(); // ✅ NUEVO

      const res = await fetch("/api/leads/asesor", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          telefono: form.telefono.trim(),
          correo: form.correo.trim(),
          estado: form.estado,
          codigo_pais: String(form.codigo_pais || "").trim(),
          pais: String(form.pais || "").trim(),
          meses_inversion: Number(form.meses_inversion) || 0,
          monto_inversion: Number(form.monto_inversion) || 0,

          fecha_lead, // ✅ SE ENVÍA AL BACKEND
        }),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(`⚠ ${data?.error || "No se pudo crear el lead"}`);
        return;
      }

      const nuevo = data.lead as Lead;
      setLeads((prev) => [nuevo, ...prev]);

      setForm({
        nombre: "",
        apellido: "",
        telefono: "",
        correo: "",
        estado: "Nuevo",
        codigo_pais: "+593",
        pais: "Ecuador",
        meses_inversion: 0,
        monto_inversion: 0,
      });

      setOpenForm(false);
    } catch {
      alert("⚠ Error creando lead");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-6 text-white/80">Cargando...</p>;
  if (error) return <p className="p-6 text-red-400">{error}</p>;

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
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

        <div className="flex-1 p-6">
          <div className="mx-auto w-full max-w-7xl">
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden">
              {/* HEADER */}
              <div className="p-6 border-b border-white/10 bg-black/25">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-white">
                      Gestión de Leads del Asesor
                    </h1>
                    <p className="text-sm text-white/60 mt-1">
                      Filtra por estado y crea leads nuevos.
                    </p>
                  </div>

                  <button
                    onClick={() => setOpenForm(true)}
                    className="
                      px-5 py-2.5 rounded-full
                      bg-emerald-500/20 border border-emerald-400/20
                      text-white font-semibold
                      hover:bg-emerald-500/30 transition
                      shadow-2xl
                    "
                    type="button"
                  >
                    + Agregar Lead
                  </button>
                </div>

                {/* ESTADO */}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <FilterBtn
                    active={filtroEstado === "todos"}
                    onClick={() => setFiltroEstado("todos")}
                  >
                    Todos
                  </FilterBtn>
                  <FilterBtn
                    active={filtroEstado === "pendiente"}
                    onClick={() => setFiltroEstado("pendiente")}
                  >
                    Pendientes
                  </FilterBtn>
                  <FilterBtn
                    active={filtroEstado === "contactado"}
                    onClick={() => setFiltroEstado("contactado")}
                  >
                    Contactados
                  </FilterBtn>
                  <FilterBtn
                    active={filtroEstado === "cerrado"}
                    onClick={() => setFiltroEstado("cerrado")}
                  >
                    Cerrados
                  </FilterBtn>

                  <div className="ml-auto text-sm text-white/60">
                    Total:{" "}
                    <span className="text-white/85 font-semibold">
                      {leadsFiltrados.length}
                    </span>
                  </div>
                </div>

                {/* ✅ FILTROS NUEVOS */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <InputSearch
                    placeholder="Filtrar por nombre..."
                    value={filtroNombre}
                    onChange={setFiltroNombre}
                  />
                  <InputSearch
                    placeholder="Filtrar por correo..."
                    value={filtroCorreo}
                    onChange={setFiltroCorreo}
                  />
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">
                      Filtrar por fecha
                    </label>
                    <input
                      type="date"
                      value={filtroFecha}
                      onChange={(e) => setFiltroFecha(e.target.value)}
                      className="
                        w-full rounded-2xl px-4 py-2.5 text-sm
                        bg-black/25 border border-white/10
                        text-white/85
                        focus:outline-none focus:ring-2 focus:ring-emerald-400/60
                      "
                    />
                  </div>
                </div>
              </div>

              {/* LISTA */}
              <div className="p-6">
                {leadsFiltrados.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-10 text-center">
                    <p className="text-white/70">
                      No hay leads para mostrar con este filtro.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {leadsFiltrados.map((lead) => {
                      const leadParaCard: LeadCardLead = {
                        ...lead,
                        estado: safeEstado(lead.estado),
                      };

                      return (
                        <div
                          key={
                            lead.id ??
                            `${lead.telefono ?? "tel"}-${lead.nombre ?? "lead"}`
                          }
                        >
                          <LeadCard lead={leadParaCard} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MODAL NUEVO LEAD */}
          {openForm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              onClick={() => !saving && setOpenForm(false)}
            >
              <div
                className="
                  w-full max-w-2xl rounded-3xl
                  border border-white/10
                  bg-white/5 backdrop-blur-2xl
                  shadow-2xl
                  p-6 text-white
                "
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Nuevo Lead</h2>
                    <p className="text-sm text-white/60 mt-1">
                      asignado_a y origen se guardan automáticamente.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpenForm(false)}
                    disabled={saving}
                    className="
                      h-10 w-10 rounded-2xl
                      border border-white/10
                      bg-white/5
                      hover:bg-white/10
                      text-white/70 hover:text-white
                      transition
                    "
                    aria-label="Cerrar"
                    title="Cerrar"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Nombre *"
                    value={form.nombre}
                    onChange={(v) => setForm((f) => ({ ...f, nombre: v }))}
                    placeholder="Ej: Juan"
                  />

                  <InputField
                    label="Apellido"
                    value={form.apellido}
                    onChange={(v) => setForm((f) => ({ ...f, apellido: v }))}
                    placeholder="Ej: Pérez"
                  />

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField
                      label="Código País"
                      value={form.codigo_pais}
                      maxLength={10}
                      onChange={(v) => {
                        if (v.length > 10) {
                          alert("⚠ El código de país no puede superar 10 caracteres");
                          return;
                        }
                        setForm((f) => ({ ...f, codigo_pais: v }));
                      }}
                      placeholder="+593"
                    />

                    <div className="md:col-span-2">
                      <InputField
                        label="Teléfono *"
                        value={form.telefono}
                        onChange={(v) => setForm((f) => ({ ...f, telefono: v }))}
                        placeholder="0999999999"
                      />
                    </div>
                  </div>

                  <InputField
                    label="Correo"
                    value={form.correo}
                    onChange={(v) => setForm((f) => ({ ...f, correo: v }))}
                    placeholder="correo@empresa.com"
                  />

                  <InputField
                    label="País"
                    value={form.pais}
                    onChange={(v) => setForm((f) => ({ ...f, pais: v }))}
                    placeholder="Ecuador"
                  />

                  <div>
                    <label className="text-sm text-white/70 mb-1 block">
                      Estado
                    </label>
                    <select
                      className="
                        w-full rounded-2xl px-3 py-2.5
                        bg-black/25 border border-white/10
                        text-white
                        focus:outline-none focus:ring-2 focus:ring-emerald-400/60
                      "
                      value={form.estado}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          estado: e.target.value as EstadoLead,
                        }))
                      }
                    >
                      <option value="Nuevo" className="bg-[#0B0D10] text-white">
                        Nuevo
                      </option>
                      <option
                        value="Contactado"
                        className="bg-[#0B0D10] text-white"
                      >
                        Contactado
                      </option>
                      <option
                        value="En Proceso"
                        className="bg-[#0B0D10] text-white"
                      >
                        En Proceso
                      </option>
                      <option value="Cerrado" className="bg-[#0B0D10] text-white">
                        Cerrado
                      </option>
                    </select>
                  </div>

                  <InputNumber
                    label="Meses de inversión"
                    value={form.meses_inversion}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, meses_inversion: v }))
                    }
                    placeholder="0"
                  />

                  <InputNumber
                    label="Monto de inversión"
                    value={form.monto_inversion}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, monto_inversion: v }))
                    }
                    placeholder="0"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 mt-6">
                  <p className="text-xs text-white/50">
                    * Obligatorio: Nombre y Teléfono
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setOpenForm(false)}
                      disabled={saving}
                      className="
                        px-4 py-2.5 rounded-full
                        border border-white/15
                        bg-white/5
                        text-white/70 hover:text-white
                        hover:bg-white/10
                        transition
                      "
                      type="button"
                    >
                      Cancelar
                    </button>

                    <button
                      onClick={crearLead}
                      disabled={saving || !form.nombre.trim() || !form.telefono.trim()}
                      className="
                        px-6 py-2.5 rounded-full
                        bg-emerald-500/20 border border-emerald-400/20
                        text-white font-semibold
                        hover:bg-emerald-500/30
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition
                      "
                      type="button"
                    >
                      {saving ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* /modal */}
        </div>
      </div>
    </div>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-full border transition text-sm font-semibold",
        active
          ? "bg-emerald-500/20 border-emerald-400/20 text-white"
          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
      ].join(" ")}
      type="button"
    >
      {children}
    </button>
  );
}

function InputSearch({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="
        w-full rounded-2xl border border-white/10 bg-black/25
        px-4 py-2.5 text-sm text-white/85
        placeholder:text-white/35 outline-none
        focus:border-emerald-400/30 focus:ring-2 focus:ring-emerald-400/60
        transition
      "
      type="text"
    />
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="text-sm text-white/70 mb-1 block">{label}</label>
      <input
        className="
          w-full rounded-2xl px-3 py-2.5
          bg-black/25 border border-white/10
          text-white placeholder:text-white/30
          focus:outline-none focus:ring-2 focus:ring-emerald-400/60
        "
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function InputNumber({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm text-white/70 mb-1 block">{label}</label>
      <input
        type="number"
        className="
          w-full rounded-2xl px-3 py-2.5
          bg-black/25 border border-white/10
          text-white placeholder:text-white/30
          focus:outline-none focus:ring-2 focus:ring-emerald-400/60
        "
        value={Number.isFinite(value) ? value : 0}
        placeholder={placeholder}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}