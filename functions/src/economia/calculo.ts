/* eslint-disable camelcase */
/**
 * Cálculos puros del servidor (sin Firestore): horas y fechas de Colombia.
 * El cálculo de precios vive en compartido/politicaComercial.ts (el mismo
 * código que usa la app) y se reexporta aquí por comodidad.
 */
export {
  calcularPrecioPaseo,
  desglosarCobro,
  desglosarPaseo,
  type DesgloseCobro,
} from '../compartido/politicaComercial';

/** Colombia no tiene horario de verano: UTC-5 todo el año. */
const OFFSET_COLOMBIA_MS = -5 * 60 * 60 * 1000;

/**
 * Hora local de Colombia (0-23) de un instante.
 * @param {number} ms Milisegundos epoch.
 * @return {number} Hora local.
 */
export function horaColombia(ms: number): number {
  return new Date(ms + OFFSET_COLOMBIA_MS).getUTCHours();
}

/**
 * Día de la semana en Colombia (0 = domingo).
 * @param {number} ms Milisegundos epoch.
 * @return {number} Día local.
 */
export function diaSemanaColombia(ms: number): number {
  return new Date(ms + OFFSET_COLOMBIA_MS).getUTCDay();
}

/**
 * Inicio del día (00:00 hora Colombia) que contiene el instante, en ms epoch.
 * @param {number} ms Milisegundos epoch.
 * @return {number} Medianoche local en ms epoch.
 */
export function inicioDiaColombia(ms: number): number {
  const local = new Date(ms + OFFSET_COLOMBIA_MS);
  local.setUTCHours(0, 0, 0, 0);
  return local.getTime() - OFFSET_COLOMBIA_MS;
}

/**
 * Fecha local (YYYY-MM-DD) en Colombia, para ids legibles de periodos.
 * @param {number} ms Milisegundos epoch.
 * @return {string} Fecha local.
 */
export function fechaColombia(ms: number): string {
  return new Date(ms + OFFSET_COLOMBIA_MS).toISOString().slice(0, 10);
}
