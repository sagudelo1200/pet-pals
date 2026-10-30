/* eslint-disable camelcase */
/**
 * Geografía de Paw-Path (núcleo puro): un solo lugar para todo lo que tenga
 * que ver con celdas H3.
 *
 * Nadie habla de "resolución 8" o "resolución 9" sueltas: se habla de ROLES.
 * Cada rol dice para qué se usa esa escala; cambiar una escala, o agregar una
 * (por ejemplo una `ciudad`), es tocar este archivo y nada más.
 *
 *   macro      R7  ~1.2 km   sectores y analítica
 *   cobertura  R8  ~460 m    matching, solicitudes, índice de cobertura, oferta y demanda
 *   micro      R9  ~174 m    observaciones del paseo (inteligencia territorial)
 *
 * Una celda H3 lleva su resolución dentro del id, así que un mismo id nunca se
 * confunde entre escalas: sirve como clave de documento tal cual.
 *
 * Compartido por la app y las Cloud Functions: debe mantenerse puro (sin
 * firebase-admin, Firestore ni process.env).
 */
import {
  cellToLatLng,
  cellToParent,
  getResolution,
  gridDisk,
  greatCircleDistance,
  isValidCell,
  latLngToCell,
} from 'h3-js';

export const RESOLUCIONES = {
  macro: 7,
  cobertura: 8,
  micro: 9,
} as const;

export type RolResolucion = keyof typeof RESOLUCIONES;

/** Anillos de celdas alrededor del origen del cuidador (k=2: 19 celdas, ~2 km). */
export const RADIO_COBERTURA = 2;

/**
 * Radios (en anillos de celdas) que un cuidador puede elegir: 1 ≈ 1 km a la
 * redonda (7 celdas), 2 ≈ 2 km (19 celdas). Con 3 serían 37 celdas, más de las
 * que admite una consulta.
 */
export const RADIOS_COBERTURA = [1, 2] as const;

/**
 * Radio de atención de un perfil: el que eligió si es válido, y si no el
 * normal.
 * @param {unknown} valor `radio_cobertura` del perfil.
 * @return {number} Anillos de celdas alrededor de su casa.
 */
export function radioDeCobertura(valor: unknown): number {
  return (RADIOS_COBERTURA as readonly unknown[]).includes(valor) ?
    valor as number : RADIO_COBERTURA;
}

/**
 * Máximo de celdas que un cuidador puede elegir a mano. Es también el límite de
 * valores de un filtro `in` de Firestore: con más, la app no podría ver las
 * solicitudes de todas sus celdas.
 */
export const MAX_CELDAS_COBERTURA = 30;

export interface Coordenada {
  latitude: number
  longitude: number
}

/**
 * Celda de un punto, en la escala de un rol.
 * @param {number} latitude Latitud.
 * @param {number} longitude Longitud.
 * @param {RolResolucion} rol Para qué se usa la celda (por defecto, cobertura).
 * @return {string} Id de la celda H3.
 */
export function celdaDe(
  latitude: number,
  longitude: number,
  rol: RolResolucion = 'cobertura'
): string {
  return latLngToCell(latitude, longitude, RESOLUCIONES[rol]);
}

/**
 * ¿Es un id de celda H3 válido?
 * @param {unknown} valor Valor a comprobar.
 * @return {boolean} true si es una celda válida.
 */
export function esCeldaValida(valor: unknown): valor is string {
  return typeof valor === 'string' && isValidCell(valor);
}

/**
 * Escala (resolución H3) de una celda.
 * @param {string} celda Celda válida.
 * @return {number} Resolución.
 */
export function resolucionDe(celda: string): number {
  return getResolution(celda);
}

/**
 * Celda que contiene a otra, en la escala de un rol (hacia arriba en la
 * jerarquía). Si ya está en esa escala, devuelve la misma.
 * @param {string} celda Celda válida.
 * @param {RolResolucion} rol Escala buscada (igual o más gruesa que la celda).
 * @return {string} Celda padre.
 */
export function padreDe(celda: string, rol: RolResolucion): string {
  const objetivo = RESOLUCIONES[rol];
  const actual = getResolution(celda);
  if (actual < objetivo) {
    throw new Error(
      `La celda ${celda} (R${actual}) es más gruesa que el rol ${rol} ` +
      `(R${objetivo})`);
  }
  return actual === objetivo ? celda : cellToParent(celda, objetivo);
}

/**
 * Celdas a k anillos de una celda (incluida ella): su vecindario.
 * @param {string} celda Celda válida.
 * @param {number} radio Anillos.
 * @return {string[]} Celdas.
 */
export function celdasAlrededor(
  celda: string,
  radio: number = RADIO_COBERTURA
): string[] {
  return gridDisk(celda, radio);
}

/**
 * Las celdas de cobertura que sirven de una lista: válidas, de la escala de
 * cobertura, sin repetir y hasta el máximo permitido.
 * @param {unknown} valor Lista recibida (puede traer basura).
 * @return {string[]} Celdas utilizables.
 */
export function celdasDeCoberturaValidas(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const celdas = new Set<string>();
  for (const c of valor) {
    if (esCeldaValida(c) && resolucionDe(c) === RESOLUCIONES.cobertura) {
      celdas.add(c);
    }
  }
  return [...celdas].slice(0, MAX_CELDAS_COBERTURA);
}

/** Por qué una selección de cobertura no se puede guardar. */
export type ErrorCobertura = 'vacia' | 'demasiadas' | 'invalida';

/**
 * ¿Se puede guardar esta selección de celdas como cobertura?
 * @param {unknown} celdas Celdas elegidas.
 * @return {ErrorCobertura | null} El problema, o null si está bien.
 */
export function errorDeCobertura(celdas: unknown): ErrorCobertura | null {
  if (!Array.isArray(celdas) || celdas.length === 0) return 'vacia';
  if (celdas.length > MAX_CELDAS_COBERTURA) return 'demasiadas';
  return celdasDeCoberturaValidas(celdas).length === celdas.length ?
    null : 'invalida';
}

/**
 * Celdas donde atiende un cuidador: el vecindario de su casa según su radio y,
 * solo si el modo manual está encendido (`funcionalidades.cobertura_manual`) y
 * él eligió celdas a mano (válidas, hasta el máximo), esas. Es la única regla:
 * la app y el servidor la usan igual.
 * @param {object} perfil `h3_r8` (casa), `radio_cobertura` y `celdas_cobertura`
 *   (manuales) del perfil.
 * @param {boolean} manual Si el modo manual está permitido.
 * @return {string[]} Celdas de cobertura (vacío si no tiene ubicación).
 */
export function celdasDeCoberturaDe(perfil: {
  h3_r8?: unknown
  radio_cobertura?: unknown
  celdas_cobertura?: unknown
}, manual = false): string[] {
  if (manual) {
    const manuales = celdasDeCoberturaValidas(perfil.celdas_cobertura);
    if (manuales.length > 0) return manuales;
  }
  return esCeldaValida(perfil.h3_r8) ?
    celdasAlrededor(perfil.h3_r8, radioDeCobertura(perfil.radio_cobertura)) : [];
}

/**
 * Distancia en km entre los centros de dos celdas.
 * @param {string} celdaA Celda válida.
 * @param {string} celdaB Celda válida.
 * @return {number} Kilómetros.
 */
export function distanciaKmEntreCeldas(celdaA: string, celdaB: string): number {
  return greatCircleDistance(cellToLatLng(celdaA), cellToLatLng(celdaB), 'km');
}

/**
 * Distancia en metros entre dos coordenadas (Haversine).
 * @param {Coordenada} a Punto A.
 * @param {Coordenada} b Punto B.
 * @return {number} Metros.
 */
export function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const R = 6371000;
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const q = Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude));
  return R * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}
