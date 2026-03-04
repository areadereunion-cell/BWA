export type Note = {
  id: number;
  contenido: string;
  autor_id: number;
  autor_nombre?: string;
  fecha_hora: string;
};

export type Lead = {
  id: number;
  nombre: string;
  apellido?: string;
  correo: string;
  telefono: string;

  codigo_pais?: string;
  pais?: string;
  meses_inversion?: number;
  monto_inversion?: number;

  origen: string;
  estado: "pendiente" | "contactado" | "cerrado" | "venta";

  asignado_a?: number | null;
  nombre_asesor?: string | null;
  duda?: string | null;
  fecha?: string | null;
};

export type TipoProducto = "plazo_fijo" | "profuturo";

export type ReglasProducto = {
  mesesOptions: number[];
  minMonto: number;
  interesFijo: boolean;
  interesMin: number;
  interesMax: number;
};