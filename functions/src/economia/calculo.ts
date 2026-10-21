/* eslint-disable camelcase */
/**
 * Cálculos puros del modelo comercial (sin Firestore).
 * La copia del app (logic/comercial/calculo.ts) debe dar los mismos
 * resultados: lo verifica __tests__/contrato-calculo-comercial.test.ts.
 */
import type {PoliticaImpuestos, PoliticaServicio} from './tipos';

/** Colombia no tiene horario de verano: UTC-5 todo el año. */
const OFFSET_COLOMBIA_MS = -5 * 60 * 60 * 1000;

/**
 * Precio de un servicio de paseo para un tutor (COP, entero).
 * Base por hora + recargo por cada mascota adicional, proporcional a la duración.
 * @param {PoliticaServicio} politica Precios vigentes del tipo de servicio.
 * @param {number} numMascotas Mascotas del tutor en el paseo.
 * @param {number} duracionMinutos Duración del paseo.
 * @return {number} Precio total en COP.
 */
export function calcularPrecioPaseo(
  politica: PoliticaServicio,
  numMascotas: number,
  duracionMinutos: number
): number {
  if (numMascotas <= 0 || duracionMinutos <= 0) return 0;
  const {base_por_hora, mascota_adicional} = politica.precio;
  const porHora = base_por_hora + (numMascotas - 1) * mascota_adicional;
  return Math.round((porHora * duracionMinutos) / 60);
}

export interface DesgloseCobro {
  /** Lo que paga el tutor. */
  valor_acordado: number
  /** Lo que se queda Paw-Path: comisión base + IVA de la comisión. */
  remuneracion_mandatario: number
  /** Lo que recibe el cuidador (dinero de terceros, sin IVA). */
  recursos_administrados: number
  comision_base: number
  iva_comision: number
}

/**
 * Desglosa el precio de un servicio en comisión (base + IVA) y dinero del
 * cuidador, según la política. Cumple la invariante I1:
 * valor_acordado = remuneracion_mandatario + recursos_administrados.
 *
 * El cuidador siempre recibe precio − comisión. Con IVA incluido, el IVA sale
 * de la comisión; sin incluir, se suma al precio que paga el tutor.
 * @param {PoliticaServicio} servicio Comisión del tipo de servicio.
 * @param {PoliticaImpuestos} impuestos IVA de la comisión.
 * @param {number} precio Precio publicado del servicio.
 * @return {DesgloseCobro} Desglose.
 */
export function desglosarCobro(
  servicio: PoliticaServicio,
  impuestos: PoliticaImpuestos,
  precio: number
): DesgloseCobro {
  const comision = Math.round((precio * servicio.comision.porcentaje_plataforma) / 100);
  const recursos_administrados = precio - comision;
  const iva = impuestos.iva_comision;

  if (!iva.aplica || iva.porcentaje === 0) {
    return {
      valor_acordado: precio, remuneracion_mandatario: comision,
      recursos_administrados, comision_base: comision, iva_comision: 0,
    };
  }
  if (iva.incluido_en_precio) {
    const comision_base = Math.round(comision / (1 + iva.porcentaje / 100));
    return {
      valor_acordado: precio, remuneracion_mandatario: comision,
      recursos_administrados, comision_base, iva_comision: comision - comision_base,
    };
  }
  const iva_comision = Math.round((comision * iva.porcentaje) / 100);
  return {
    valor_acordado: precio + iva_comision,
    remuneracion_mandatario: comision + iva_comision,
    recursos_administrados, comision_base: comision, iva_comision,
  };
}

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
