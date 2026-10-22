/**
 * Cálculo de precios para mostrar al usuario. Es el MISMO código con el que
 * el servidor cobra (functions/src/compartido/politicaComercial.ts): aquí
 * solo se reexporta y se añaden ayudas de presentación.
 */
import {
  desglosarCobro,
  desglosarPaseo,
  type ContenidoPoliticaComercial,
  type PoliticaServicio,
} from '@/functions/src/compartido/politicaComercial'

export {
  calcularPrecioPaseo,
  desglosarCobro,
  desglosarPaseo,
  type DesgloseCobro,
} from '@/functions/src/compartido/politicaComercial'

/** Total que paga el tutor por un paseo (incluye el IVA si se suma aparte). */
export function calcularTotalPaseo(
  politica: ContenidoPoliticaComercial,
  numMascotas: number,
  duracionMinutos: number
): number {
  return desglosarPaseo(politica, numMascotas, duracionMinutos).valor_acordado
}

/** Lo que recibe el cuidador de un precio, según la comisión vigente. */
export function calcularIngresoCuidador(
  politica: PoliticaServicio,
  precio: number
): number {
  return desglosarCobro(
    politica,
    { iva_comision: { aplica: false, porcentaje: 0, incluido_en_precio: true } },
    precio
  ).recursos_administrados
}

/** Formato de moneda colombiana sin decimales: $18.000 */
export function formatearCOP(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`
}
