import type { ReglasProducto, TipoProducto } from "../types";

export function getReglasProducto(tipo: TipoProducto): ReglasProducto {
  return tipo === "plazo_fijo"
    ? {
        mesesOptions: [12],
        minMonto: 2000,
        interesFijo: false,
        interesMin: 1,
        interesMax: 3,
      }
    : {
        mesesOptions: [36, 48, 60],
        minMonto: 5000,
        interesFijo: true,
        interesMin: 3,
        interesMax: 3,
      };
}