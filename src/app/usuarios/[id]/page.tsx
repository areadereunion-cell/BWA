"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

type UrlOrNull = string | null;

interface Requisitos {
  hoja_vida: UrlOrNull;
  copia_cedula: UrlOrNull;
  certificado_votacion: UrlOrNull;
  foto_carnet: UrlOrNull;
  titulo_estudios: UrlOrNull;
  certificados_cursos: UrlOrNull;
  certificados_laborales: UrlOrNull;
  certificados_honorabilidad: UrlOrNull;
  historial_iess: UrlOrNull;
  antecedentes_penales: UrlOrNull;
  certificado_bancario: UrlOrNull;
  ruc: UrlOrNull;
  acuerdo_privacidad: UrlOrNull;
  certificado_discapacidad: UrlOrNull;
  partida_matrimonio: UrlOrNull;
  partida_nacimiento_hijos: UrlOrNull;
}

interface UserDetail {
  id: number;
  nombre: string;
  correo: string;
  cedula: string;
  rol: string;
  estado_expediente: "COMPLETO" | "INCOMPLETO";
  foto_asesor?: string;
  cedula_frontal?: string;
  cedula_reverso?: string;

  linkedin_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  x_url?: string | null;
}

type ReqKey = keyof Requisitos;

const OPTIONAL_REQS: ReqKey[] = [
  "certificado_discapacidad",
  "partida_matrimonio",
  "partida_nacimiento_hijos",
];

export default function UsuarioDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [authStatus, setAuthStatus] = useState<
    "loading" | "authorized" | "unauthorized"
  >("loading");
  const [userRol, setUserRol] = useState<string | null>(null);

  const [user, setUser] = useState<UserDetail | null>(null);
  const [requisitos, setRequisitos] = useState<Requisitos | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [noAplica, setNoAplica] = useState<Record<string, boolean>>({});

  const [social, setSocial] = useState({
    linkedin_url: "",
    facebook_url: "",
    instagram_url: "",
    tiktok_url: "",
    x_url: "",
  });
  const [savingSocial, setSavingSocial] = useState(false);

  // ---------------------------
  // ✅ Verificación de acceso
  // ---------------------------
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const res = await fetch("/api/auth/verify", {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json();

        if (
          data.ok &&
          (data.user.rol === "admin" ||
            data.user.rol === "spa" ||
            data.user.rol === "rrhh")
        ) {
          setUserRol(data.user.rol);
          setAuthStatus("authorized");
        } else {
          setAuthStatus("unauthorized");
        }
      } catch {
        setAuthStatus("unauthorized");
      }
    };

    verifyUser();
  }, []);

  // ✅ Redirección
  useEffect(() => {
    if (authStatus === "unauthorized") router.replace("/login");
  }, [authStatus, router]);

  // ---------------------------
  // ✅ Cargar usuario (solo si autorizado)
  // ---------------------------
  const loadUser = async () => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setUser(data.user);
        setRequisitos(data.requisitos);

        const inferred: Record<string, boolean> = {};
        OPTIONAL_REQS.forEach((k) => {
          inferred[k] = data.requisitos?.[k] === null ? true : false;
        });
        setNoAplica((prev) => ({ ...inferred, ...prev }));

        setSocial({
          linkedin_url: data.user?.linkedin_url || "",
          facebook_url: data.user?.facebook_url || "",
          instagram_url: data.user?.instagram_url || "",
          tiktok_url: data.user?.tiktok_url || "",
          x_url: data.user?.x_url || "",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === "authorized") loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, id]);

  // ---------------------------
  // ✅ Acciones
  // ---------------------------
  const uploadImage = async (file: File, field: string) => {
    setUploading(field);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("field", field);
    fd.append("userId", String(id));

    await fetch("/api/users/upload-image", {
      method: "POST",
      credentials: "include",
      body: fd,
    });

    await loadUser();
    setUploading(null);
  };

  const uploadReqFile = async (file: File, field: ReqKey) => {
    setUploading(field);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("field", field);
    fd.append("userId", String(id));

    const res = await fetch("/api/requisitos/upload-file", {
      method: "POST",
      credentials: "include",
      body: fd,
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok && typeof data.url === "string") {
      setRequisitos((prev) => (prev ? { ...prev, [field]: data.url } : prev));
      setNoAplica((prev) => ({ ...prev, [field]: false }));
    }

    setUploading(null);
  };

  const deleteReqFile = async (field: ReqKey) => {
    setUploading(field);

    try {
      const res = await fetch("/api/requisitos/delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: id, field }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        setRequisitos((prev) => (prev ? { ...prev, [field]: null } : prev));
      }
    } finally {
      setUploading(null);
    }
  };

  const toggleNoAplica = async (field: ReqKey) => {
    const newValue = !noAplica[field];

    setNoAplica((prev) => ({ ...prev, [field]: newValue }));
    setRequisitos((prev) => (prev ? { ...prev, [field]: null } : prev));

    await fetch("/api/requisitos/set-false", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId: id, field }),
    });
  };

  // ✅ Download por API para Cloudinary
  const downloadFile = (value: unknown, field: ReqKey) => {
    if (typeof value !== "string" || !value) return;

    const url =
      value.startsWith("http") || value.startsWith("/") ? value : `/${value}`;

    if (url.includes("res.cloudinary.com")) {
      const last = url.split("/").pop() || "";
      const extMatch = last.match(/\.(pdf|png|jpg|jpeg|webp)$/i);
      const ext = extMatch ? extMatch[0].toLowerCase() : ".pdf";
      const filename = `${field}${ext}`;

      const apiUrl = `/api/download?url=${encodeURIComponent(
        url
      )}&name=${encodeURIComponent(filename)}`;

      const a = document.createElement("a");
      a.href = apiUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const saveSocial = async () => {
    setSavingSocial(true);
    try {
      await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          linkedin_url: social.linkedin_url || null,
          facebook_url: social.facebook_url || null,
          instagram_url: social.instagram_url || null,
          tiktok_url: social.tiktok_url || null,
          x_url: social.x_url || null,
        }),
      });

      await loadUser();
    } finally {
      setSavingSocial(false);
    }
  };

  // ---------------------------
  // ✅ UI components internos
  // ---------------------------
  const FieldRow = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-white/10 last:border-b-0">
      <p className="text-sm text-white/60">{label}</p>
      <div className="text-sm text-white text-right break-all">{value}</div>
    </div>
  );

  const SocialInput = ({
    label,
    keyName,
  }: {
    label: string;
    keyName: keyof typeof social;
  }) => {
    const current = (user as any)?.[keyName] as string | null | undefined;

    return (
      <div className="space-y-2">
        <label className="text-xs text-white/60">{label}</label>
        <input
          value={social[keyName]}
          onChange={(e) =>
            setSocial((s) => ({ ...s, [keyName]: e.target.value }))
          }
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/20"
          placeholder={`Pega el link de ${label}`}
        />
        {current && (
          <a
            href={current}
            target="_blank"
            rel="noreferrer"
            className="inline-flex text-sm text-emerald-300 hover:text-emerald-200 underline"
          >
            Abrir {label}
          </a>
        )}
      </div>
    );
  };

  const ReqItem = ({
    label,
    field,
    value,
  }: {
    label: string;
    field: ReqKey;
    value: UrlOrNull;
  }) => {
    const optional = OPTIONAL_REQS.includes(field);
    const disabled = !!noAplica[field];
    const uploaded = !!value;
    const isUploading = uploading === field;

    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-white">{label}</p>

          {optional && (
            <label className="flex items-center gap-2 text-xs text-white/70">
              No aplica
              <input
                type="checkbox"
                checked={!!noAplica[field]}
                onChange={() => toggleNoAplica(field)}
                className="accent-blue-500"
              />
            </label>
          )}
        </div>

        {disabled ? (
          <p className="text-yellow-300 text-xs">Marcado como NO APLICA</p>
        ) : (
          <>
            <p
              className={
                uploaded ? "text-emerald-300 text-xs" : "text-red-300 text-xs"
              }
            >
              {uploaded ? "✔ Documento cargado" : "✘ Pendiente"}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {uploaded && (
                <>
                  <button
                    type="button"
                    onClick={() => downloadFile(value, field)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs border border-white/10"
                  >
                    Descargar
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteReqFile(field)}
                    disabled={isUploading}
                    aria-label="Quitar documento"
                    title="Quitar documento"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-60 text-white border border-white/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}

              <label className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs border border-white/10 cursor-pointer">
                Subir archivo
                <input
                  type="file"
                  onChange={(e) =>
                    e.target.files && uploadReqFile(e.target.files[0], field)
                  }
                  className="hidden"
                />
              </label>

              {isUploading && (
                <span className="text-xs text-blue-300">Procesando...</span>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const ImageBlock = ({
    label,
    src,
    field,
  }: {
    label: string;
    src?: string;
    field: string;
  }) => {
    const isUploading = uploading === field;

    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">{label}</p>
          {isUploading && (
            <span className="text-xs text-blue-300">Subiendo...</span>
          )}
        </div>

        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src || "/placeholder.png"}
            className="w-full h-48 object-cover"
            alt={label}
          />
        </div>

        <label className="inline-flex items-center justify-center w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs border border-white/10 cursor-pointer">
          {isUploading ? "Subiendo..." : "Cambiar imagen"}
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              e.target.files && uploadImage(e.target.files[0], field)
            }
            className="hidden"
          />
        </label>
      </div>
    );
  };

  const expedienteBadge = useMemo(() => {
    if (!user) return null;
    const ok = user.estado_expediente === "COMPLETO";
    return (
      <span
        className={[
          "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border",
          ok
            ? "bg-emerald-500/10 text-emerald-200 border-emerald-500/20"
            : "bg-yellow-500/10 text-yellow-200 border-yellow-500/20",
        ].join(" ")}
      >
        {ok ? "✔ Expediente completo" : "⚠ Expediente incompleto"}
      </span>
    );
  }, [user]);

  // ---------------------------
  // ✅ Guards
  // ---------------------------
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Validando acceso...
      </div>
    );
  }

  if (authStatus === "unauthorized") return null;

  if (loading) return <p className="p-8 text-white/60">Cargando...</p>;
  if (!user || !requisitos) return <p className="p-8 text-red-300">Error</p>;

  // ---------------------------
  // ✅ Render
  // ---------------------------
  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/fondo-bg.png')" }}
    >
      <div className="min-h-screen bg-black/70">
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="rounded-2xl p-6 border border-white/10 bg-white/5 shadow-xl backdrop-blur-md">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Detalle del Asesor
                </h1>
                <p className="text-white/70 text-sm">
                  {user.nombre} · {user.correo}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {expedienteBadge}
                <button
                  onClick={() => router.back()}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm border border-white/10"
                  type="button"
                >
                  Volver
                </button>
              </div>
            </div>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: info + redes */}
            <div className="lg:col-span-4 space-y-6">
              {/* Info */}
              <div className="rounded-2xl p-6 border border-white/10 bg-white/5 shadow-xl backdrop-blur-md">
                <h2 className="text-white font-semibold text-base mb-3">
                  Información
                </h2>

                <div className="space-y-0">
                  <FieldRow label="Nombre" value={user.nombre} />
                  <FieldRow label="Correo" value={user.correo} />
                  <FieldRow label="Cédula" value={user.cedula} />
                  <FieldRow label="Rol del usuario" value={user.rol} />
                  <FieldRow label="Tu acceso" value={userRol ?? "-"} />
                </div>
              </div>

              {/* Redes */}
              <div className="rounded-2xl p-6 border border-white/10 bg-white/5 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-white font-semibold text-base">
                    Redes sociales
                  </h2>
                  <button
                    type="button"
                    onClick={saveSocial}
                    disabled={savingSocial}
                    className="px-4 py-2 rounded-lg bg-blue-600/90 hover:bg-blue-600 disabled:opacity-60 text-white text-sm border border-white/10"
                  >
                    {savingSocial ? "Guardando..." : "Guardar"}
                  </button>
                </div>

                <div className="space-y-4">
                  <SocialInput label="LinkedIn" keyName="linkedin_url" />
                  <SocialInput label="Facebook" keyName="facebook_url" />
                  <SocialInput label="Instagram" keyName="instagram_url" />
                  <SocialInput label="TikTok" keyName="tiktok_url" />
                  <SocialInput label="X" keyName="x_url" />
                </div>
              </div>
            </div>

            {/* Middle: imágenes */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-2xl p-6 border border-white/10 bg-white/5 shadow-xl backdrop-blur-md">
                <h2 className="text-white font-semibold text-base mb-4">
                  Imágenes
                </h2>

                <div className="space-y-4">
                  <ImageBlock
                    label="Foto del asesor"
                    src={user.foto_asesor}
                    field="foto_asesor"
                  />
                  <ImageBlock
                    label="Cédula frontal"
                    src={user.cedula_frontal}
                    field="cedula_frontal"
                  />
                  <ImageBlock
                    label="Cédula reverso"
                    src={user.cedula_reverso}
                    field="cedula_reverso"
                  />
                </div>
              </div>
            </div>

            {/* Right: requisitos */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-2xl p-6 border border-white/10 bg-white/5 shadow-xl backdrop-blur-md">
                <h2 className="text-white font-semibold text-base mb-4">
                  Requisitos
                </h2>

                {/* ✅ 2 columnas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ReqItem
                    label="Hoja de vida"
                    field="hoja_vida"
                    value={requisitos.hoja_vida}
                  />
                  <ReqItem
                    label="Copia cédula"
                    field="copia_cedula"
                    value={requisitos.copia_cedula}
                  />
                  <ReqItem
                    label="Certificado votación"
                    field="certificado_votacion"
                    value={requisitos.certificado_votacion}
                  />
                  <ReqItem
                    label="Foto carnet"
                    field="foto_carnet"
                    value={requisitos.foto_carnet}
                  />
                  <ReqItem
                    label="Título estudios"
                    field="titulo_estudios"
                    value={requisitos.titulo_estudios}
                  />

                  <ReqItem
                    label="Certificados cursos"
                    field="certificados_cursos"
                    value={requisitos.certificados_cursos}
                  />
                  <ReqItem
                    label="Certificados laborales"
                    field="certificados_laborales"
                    value={requisitos.certificados_laborales}
                  />
                  <ReqItem
                    label="Certificados honorabilidad"
                    field="certificados_honorabilidad"
                    value={requisitos.certificados_honorabilidad}
                  />
                  <ReqItem
                    label="Historial IESS"
                    field="historial_iess"
                    value={requisitos.historial_iess}
                  />
                  <ReqItem
                    label="Antecedentes penales"
                    field="antecedentes_penales"
                    value={requisitos.antecedentes_penales}
                  />
                  <ReqItem
                    label="Certificado bancario"
                    field="certificado_bancario"
                    value={requisitos.certificado_bancario}
                  />
                  <ReqItem label="RUC" field="ruc" value={requisitos.ruc} />    

                      {/* ✅ NUEVO */}
                      <ReqItem
                        label="Acuerdo de privacidad"
                        field="acuerdo_privacidad"
                        value={requisitos.acuerdo_privacidad}
                      />
                  <ReqItem
                    label="Discapacidad"
                    field="certificado_discapacidad"
                    value={requisitos.certificado_discapacidad}
                  />
                  <ReqItem
                    label="Acta matrimonio"
                    field="partida_matrimonio"
                    value={requisitos.partida_matrimonio}
                  />
                  <ReqItem
                    label="Nacimiento hijos"
                    field="partida_nacimiento_hijos"
                    value={requisitos.partida_nacimiento_hijos}
                  />
                </div>
              </div>

              {/* CTA volver */}
              <div className="rounded-2xl p-4 border border-white/10 bg-white/5 shadow-xl backdrop-blur-md">
                <button
                  onClick={() => router.back()}
                  className="w-full px-6 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm border border-white/10"
                  type="button"
                >
                  Volver
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
